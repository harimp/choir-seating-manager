#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import 'source-map-support/register';
import { DomainStack } from '../lib/domain-stack';
import { WebsiteStack } from '../lib/website-stack';
import { DataPlaneStack } from '../lib/data-plane-stack';

const app = new App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const domainStack = new DomainStack(app, 'DomainStack', {
  env,
  description: 'Choir Seating Manager - Domain and Certificate',
});

new DataPlaneStack(app, 'DataPlaneStack', {
  env,
  description: 'Choir Seating Manager - Data Plane (APIs, Databases, etc.)',
  domainStack,
});

new WebsiteStack(app, 'ChoirSeatingManagerStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Choir Seating Manager - Static Website on S3 + CloudFront',
  domainStack,
});

app.synth();
