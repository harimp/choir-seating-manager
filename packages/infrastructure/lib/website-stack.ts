import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';
import * as path from 'path';
import { DomainStack } from './domain-stack';
import { ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';

export interface WebsiteStackProps extends cdk.StackProps {
  domainStack: DomainStack;
}

export class WebsiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebsiteStackProps) {
    super(scope, id, props);

    // S3 bucket for hosting the static website
    const websiteBucket = new s3.Bucket(this, 'ChoirSeatingWebsiteBucket', {
      bucketName: `choir-seating-manager-${this.account}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(
      this,
      'ChoirSeatingDistribution',
      {
        defaultRootObject: 'index.html',
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(5),
          },
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(5),
          },
        ],
        domainNames: [props.domainStack.HOST_DOMAIN],
        certificate: props.domainStack.certificate,
      }
    );

    // Route53 A Record for the CloudFront distribution
    new ARecord(this, 'SiteAliasRecord', {
      recordName: props.domainStack.HOST_DOMAIN,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      zone: props.domainStack.hostedZone,
    });

    // Deploy website to S3
    new s3deploy.BucketDeployment(this, 'DeployChoirSeatingWebsite', {
      sources: [
        s3deploy.Source.asset(
          path.join(__dirname, '../../website/dist')
        ),
      ],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
    });
  }
}
