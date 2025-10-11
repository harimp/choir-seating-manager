import { Stack, StackProps, RemovalPolicy, CfnOutput, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as path from "path";

export class DataPlaneStack extends Stack {
    public readonly sessionTable: dynamodb.Table;
    public readonly api: apigateway.RestApi;

    constructor(scope: Construct, id: string, props: StackProps) {
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

        // Add GSI for querying by session name
        this.sessionTable.addGlobalSecondaryIndex({
            indexName: "SessionNameIndex",
            partitionKey: {
                name: "sessionName",
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL,
        });

        // Create single Lambda function for all operations
        const sessionsLambda = new lambda.Function(this, "SessionsFunction", {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: "index.handler",
            code: lambda.Code.fromAsset(path.join(__dirname, "../../api"), {
                bundling: {
                    image: lambda.Runtime.NODEJS_20_X.bundlingImage,
                    command: [
                        "bash", "-c",
                        "npm ci && npm run build && cp -r dist/* /asset-output/ && cp -r node_modules /asset-output/"
                    ],
                },
            }),
            environment: {
                TABLE_NAME: this.sessionTable.tableName,
            },
            timeout: Duration.seconds(30),
        });

        // Grant DynamoDB permissions to Lambda function
        this.sessionTable.grantReadWriteData(sessionsLambda);

        // Create API Gateway
        this.api = new apigateway.RestApi(this, "SessionsApi", {
            restApiName: "Choir Sessions API",
            description: "API for managing choir seating sessions",
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ["Content-Type", "Authorization"],
            },
        });

        // Create Lambda integration (shared for all routes)
        const lambdaIntegration = new apigateway.LambdaIntegration(sessionsLambda);

        // Create API resources and methods
        const sessions = this.api.root.addResource("sessions");

        // POST /sessions - Create session
        sessions.addMethod("POST", lambdaIntegration);

        // GET /sessions/{sessionName} - Get session
        const sessionByName = sessions.addResource("{sessionName}");
        sessionByName.addMethod("GET", lambdaIntegration);

        // PUT /sessions/{sessionName} - Update session
        sessionByName.addMethod("PUT", lambdaIntegration);

        // DELETE /sessions/{sessionName} - Delete session
        sessionByName.addMethod("DELETE", lambdaIntegration);

        // Output API URL
        new CfnOutput(this, "ApiUrl", {
            value: this.api.url,
            description: "URL of the Sessions API",
            exportName: "ChoirSessionsApiUrl",
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
