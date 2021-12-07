import * as cdk from "@aws-cdk/core";
import * as cognito from "@aws-cdk/aws-cognito";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodejs from "@aws-cdk/aws-lambda-nodejs";
import * as waf from "@aws-cdk/aws-wafv2";
import * as agw from "@aws-cdk/aws-apigateway";

interface APIStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
}

export class APIStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: APIStackProps) {
    super(scope, id, props);

    const authorizer = new agw.CognitoUserPoolsAuthorizer(this, "Authorizer", {
      cognitoUserPools: [props.userPool],
    });

    // Definition of lambda function
    const getTimeFunction = new lambdaNodejs.NodejsFunction(this, "getTime", {
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_14_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      entry: "./lambda/time/get.ts",
    });

    // Definition of WAF
    const ipRanges: string[] = scope.node.tryGetContext(
      "allowedIpAddressRanges"
    );

    const wafIPSet = new waf.CfnIPSet(this, `IPSet`, {
      name: "BackendWebAclIpSet",
      ipAddressVersion: "IPV4",
      scope: "REGIONAL",
      addresses: ipRanges,
    });

    const apiWaf = new waf.CfnWebACL(this, "waf", {
      defaultAction: { block: {} },
      scope: "REGIONAL",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        sampledRequestsEnabled: true,
        metricName: "ApiGatewayWAF",
      },
      // https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/aws-managed-rule-groups-list.html
      rules: [
        // AWSManagedRulesCommonRuleSet
        {
          priority: 1,
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "AWS-AWSManagedRulesCommonRuleSet",
          },
          name: "AWSManagedRulesCommonRuleSet",
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesCommonRuleSet",
            },
          },
        },
        // AWSManagedRulesKnownBadInputsRuleSet
        {
          priority: 2,
          name: "BackendWebAclIpRuleSet",
          action: { allow: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "BackendWebAclIpRuleSet",
          },
          statement: {
            ipSetReferenceStatement: {
              arn: wafIPSet.attrArn,
            },
          },
        },
      ],
    });

    // Definition of API Gateway
    const api = new agw.RestApi(this, "api", {
      deployOptions: {
        stageName: "api",
      },
      defaultCorsPreflightOptions: {
        allowOrigins: agw.Cors.ALL_ORIGINS,
        allowMethods: agw.Cors.ALL_METHODS,
      },
    });

    // Associate WAF with API Gateway
    const region = cdk.Stack.of(this).region;
    const restApiId = api.restApiId;
    const stageName = api.deploymentStage.stageName;
    new waf.CfnWebACLAssociation(this, "apply-waf-apigw", {
      webAclArn: apiWaf.attrArn,
      resourceArn: `arn:aws:apigateway:${region}::/restapis/${restApiId}/stages/${stageName}`,
    });

    // GET: /time
    const userinfo = api.root.addResource("time");
    userinfo.addMethod("GET", new agw.LambdaIntegration(getTimeFunction), {
      authorizer: authorizer,
      authorizationType: agw.AuthorizationType.COGNITO,
    });
  }
}
