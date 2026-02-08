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

export interface BetaWebsiteStackProps extends cdk.StackProps {
  domainStack: DomainStack;
}

export class BetaWebsiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BetaWebsiteStackProps) {
    super(scope, id, props);

    // S3 bucket for hosting the beta static website
    const websiteBucket = new s3.Bucket(this, 'BetaWebsiteBucket', {
      bucketName: `choir-seating-manager-beta-${this.account}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront distribution for beta
    const distribution = new cloudfront.Distribution(
      this,
      'BetaDistribution',
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
        domainNames: [props.domainStack.BETA_DOMAIN],
        certificate: props.domainStack.betaCertificate,
      }
    );

    // Route53 A Record for the beta CloudFront distribution
    new ARecord(this, 'BetaSiteAliasRecord', {
      recordName: props.domainStack.BETA_DOMAIN,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      zone: props.domainStack.hostedZone,
    });

    // Deploy beta website to S3 (from website-v2 package)
    new s3deploy.BucketDeployment(this, 'DeployBetaWebsite', {
      sources: [
        s3deploy.Source.asset(
          path.join(__dirname, '../../website-v2/dist')
        ),
      ],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
    });
  }
}
