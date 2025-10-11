#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import 'source-map-support/register';
import { WebsiteStack } from '../lib/website-stack';

const app = new App();

new WebsiteStack(app, 'ChoirSeatingManagerStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Choir Seating Manager - Static Website on S3 + CloudFront',
});

app.synth();
