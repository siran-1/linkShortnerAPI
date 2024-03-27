provider "aws" {
  region = var.aws_region
}

resource "aws_elastic_beanstalk_environment" "existing_eb_env" {
  name                = "ShortLinkAPI"  # Your Elastic Beanstalk Environment Name
  application         = "ShortLinkAPI"      # Your Elastic Beanstalk Application Name
  solution_stack_name = "64bit Amazon Linux 2023 v6.0.3 running Node.js 18" 
  # No 'setting' block is needed if no specific settings are required
}
