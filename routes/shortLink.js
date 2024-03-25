var express = require("express");
var router = express.Router();
const pool = require("../public/javascripts/DBConnection/databaseconnection");
const validator = require("validator");
const crypto = require("crypto");
const async = require("async"); // Importing async for queue based processing

const concurrency = 4;


router.get("/", function (req, res, next) {
  res.status(200).send('OK');
  });


// Task function for the queue
const processLinkShorteningTask = (task, done) => {
  const { receivedURL, res } = task;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting connection from pool:", err);
      return done(err); 
    }

    connection.query("SELECT * FROM short_links WHERE original_url = ?", [receivedURL], async (err, results) => {
      if (err) {
        console.error("MySQL query error:", err);
        connection.release();
        return done(err);
      }

      if (results.length > 0) {
        // URL already exists, return the existing shortened URL
        connection.release();
        done(null, { originalURL: receivedURL, shortenedURL: results[0].short_url }); 
      } else {
        // URL doesn't exist, generate a unique hash and store in the database
        const uniqueIdentifier = await generateUniqueHash(receivedURL);
        const shortenedURL = `http://shortlink.in.net/${uniqueIdentifier}`;

        connection.query("INSERT INTO short_links (original_url, short_url, hash) VALUES (?, ?, ?)", [receivedURL, shortenedURL, uniqueIdentifier], (err) => {
          connection.release(); 
          if (err) {
            console.error("MySQL insert error:", err);
            return done(err);
          }
          done(null, { originalURL: receivedURL, shortenedURL: shortenedURL, hash: uniqueIdentifier });
        });
      }
    });
  });
};
// initializing the queue by passing in the taskfunction and the concurrency
const linkShorteningQueue = async.queue(processLinkShorteningTask, concurrency);

// Define what happens when a task is completed
linkShorteningQueue.drain(() => {
  console.log("All link shortening tasks have been processed");
});

// main route handler
router.post("/shortLink", function (req, res, next) {
  
  const receivedURL = req.body.URL;
  console.log(receivedURL);
  // if (!validator.isURL(receivedURL)) {
  //   return res.status(400).json({ error: "Invalid URL" });
  // }
  // Adding the received url to the queue object 
  linkShorteningQueue.push({ receivedURL, res }, (err, result) => {
    if (err) {
      // Handle errors that occurred during the task processing
      return res.status(500).json({ error: "Internal Server Error" });
    }
    // Send the response back to the client
    console.log(result);
    res.json(result);
  });
});


// generate hash and check for uniqueness
async function generateUniqueHash(url) {
  let hash = generateHash(url);
  try {
    const isUnique = await checkUniqueness(hash);
    console.log("is it unique " + isUnique);
    if (isUnique) {
      return hash;
    } else {
      return generateUniqueHash(url, pool); // If not unique, recursively call the function to generate a new hash
    }
  } catch (error) {
    throw error;
  }
}

// this checks the uniqueness of the generated shortlink
function checkUniqueness(hash) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error("Error getting connection from pool:", err);
        resolve(false);
        return;
      }
      connection.query("SELECT * FROM short_links WHERE hash = ?",[hash],(err, results) => { // check if the shortened url is present in db;
          if (err) {
            console.error("MySQL query error:", err);
            resolve(false);
          } else {
            resolve(results.length === 0);  // If resolve is true, the hash is unique; otherwise, it's not unique
          }
          connection.release(); // Release the connection back to the pool
        }
      );
    });
  });
}

// this generates the hash that will be attached to the link and is converted to a hex hash
function generateHash(url) {
  const hash = crypto.createHash("sha256");
  hash.update(url);
  return hash.digest("hex").substring(0, 8);
}

module.exports = router;
