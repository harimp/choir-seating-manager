import { Stack, StackProps, RemovalPolicy, CfnOutput, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53targets from "aws-cdk-lib/aws-route53-targets";
import * as path from "path";
import { DomainStack } from "./domain-stack";

export interface DataPlaneStackProps extends StackProps {
    domainStack: DomainStack;
}

export class DataPlaneStack extends Stack {
    public readonly sessionTable: dynamodb.Table;
    public readonly snapshotTable: dynamodb.Table;
    public readonly api: apigateway.RestApi;
    public readonly customDomain: apigateway.DomainName;

    constructor(scope: Construct, id: string, props: DataPlaneStackProps) {
        super(scope, id, props);

        // Create DynamoDB table for session management
        this.sessionTable = new dynamodb.Table(this, "SessionTable", {
            tableName: "choir-sessions",
            partitionKey: {
                name: "sessionId",
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
            removalPolicy: RemovalPolicy.RETAIN,
        });

        // Add GSI for querying by session code
        this.sessionTable.addGlobalSecondaryIndex({
            indexName: "SessionCodeIndex",
            partitionKey: {
                name: "sessionCode",
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL,
        });

        // Create DynamoDB table for snapshot management
        this.snapshotTable = new dynamodb.Table(this, "SnapshotTable", {
            tableName: "choir-snapshots",
            partitionKey: {
                name: "snapshotId",
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
            removalPolicy: RemovalPolicy.RETAIN,
        });

        // Add GSI for querying snapshots by session code
        this.snapshotTable.addGlobalSecondaryIndex({
            indexName: "SessionCodeIndex",
            partitionKey: {
                name: "sessionCode",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "updatedAt",
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL,
        });

        // Create single Lambda function for all operations
        const sessionsLambda = new nodejs.NodejsFunction(this, "SessionsFunction", {
            entry: path.join(__dirname, "../../api/src/index.ts"),
            handler: "handler",
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                TABLE_NAME: this.sessionTable.tableName,
                SNAPSHOTS_TABLE_NAME: this.snapshotTable.tableName,
            },
            timeout: Duration.seconds(30),
            bundling: {
                minify: true,
                sourceMap: true,
                target: "es2020",
                externalModules: [
                    "@aws-sdk/client-dynamodb",
                    "@aws-sdk/lib-dynamodb",
                ],
            },
        });

        // Grant DynamoDB permissions to Lambda function
        this.sessionTable.grantReadWriteData(sessionsLambda);
        this.snapshotTable.grantReadWriteData(sessionsLambda);

        // Create API Gateway
        this.api = new apigateway.RestApi(this, "SessionsApi", {
            restApiName: "Choir Sessions API",
            description: "API for managing choir seating sessions",
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ["Content-Type", "Authorization"],
            },
            deployOptions: {
                stageName: "prod",
            },
        });

        // Create custom domain for API Gateway
        this.customDomain = new apigateway.DomainName(this, "ApiCustomDomain", {
            domainName: props.domainStack.API_DOMAIN,
            certificate: props.domainStack.apiCertificate,
            endpointType: apigateway.EndpointType.REGIONAL,
        });

        // Map custom domain to API Gateway
        new apigateway.BasePathMapping(this, "ApiBasePathMapping", {
            domainName: this.customDomain,
            restApi: this.api,
            stage: this.api.deploymentStage,
        });

        // Create Route53 A record for API subdomain
        new route53.ARecord(this, "ApiAliasRecord", {
            zone: props.domainStack.hostedZone,
            recordName: props.domainStack.API_DOMAIN,
            target: route53.RecordTarget.fromAlias(
                new route53targets.ApiGatewayDomain(this.customDomain)
            ),
        });

        // Create Lambda integration (shared for all routes)
        const lambdaIntegration = new apigateway.LambdaIntegration(sessionsLambda);

        // Create API resources and methods
        const sessions = this.api.root.addResource("sessions");

        // POST /sessions - Create session
        sessions.addMethod("POST", lambdaIntegration);

        // GET /sessions/{sessionCode} - Get session
        const sessionByCode = sessions.addResource("{sessionCode}");
        sessionByCode.addMethod("GET", lambdaIntegration);

        // PUT /sessions/{sessionCode} - Update session
        sessionByCode.addMethod("PUT", lambdaIntegration);

        // DELETE /sessions/{sessionCode} - Delete session
        sessionByCode.addMethod("DELETE", lambdaIntegration);

        // Output API URLs
        new CfnOutput(this, "ApiUrl", {
            value: this.api.url,
            description: "Default URL of the Sessions API",
            exportName: "ChoirSessionsApiUrl",
        });

        new CfnOutput(this, "ApiCustomDomainUrl", {
            value: `https://${props.domainStack.API_DOMAIN}`,
            description: "Custom domain URL of the Sessions API",
            exportName: "ChoirSessionsApiCustomUrl",
        });

        new CfnOutput(this, "SessionTableName", {
            value: this.sessionTable.tableName,
            description: "Name of the DynamoDB session table",
            exportName: "ChoirSessionTableName",
        });

        new CfnOutput(this, "SessionTableArn", {
            value: this.sessionTable.tableArn,
            description: "ARN of the DynamoDB session table",
            exportName: "ChoirSessionTableArn",
        });
    }
}
