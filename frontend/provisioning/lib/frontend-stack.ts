import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as s3 from "@aws-cdk/aws-s3";
import * as s3deploy from "@aws-cdk/aws-s3-deployment";
import * as customResources from "@aws-cdk/custom-resources";
import * as path from "path";

export class FrontendStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
      websiteErrorDocument: "index.html",
      websiteIndexDocument: "index.html",
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });

    const websiteIdentity = new cloudfront.OriginAccessIdentity(
      this,
      "WebsiteIdentity"
    );
    websiteBucket.grantRead(websiteIdentity);
    const webAclRef = new SsmParameterReader(this, "WebAclArnParameterReader", {
      parameterName: "WebAclArnParameter",
      region: "us-east-1",
    }).stringValue;

    const websiteDistribution = new cloudfront.CloudFrontWebDistribution(
      this,
      "WebsiteDistribution",
      {
        webACLId: webAclRef,
        errorConfigurations: [
          {
            errorCachingMinTtl: 300,
            errorCode: 404,
            responseCode: 200,
            responsePagePath: "/index.html",
          },
        ],
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: websiteBucket,
              originAccessIdentity: websiteIdentity,
            },
            behaviors: [
              {
                isDefaultBehavior: true,
              },
            ],
          },
        ],
        priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      }
    );

    new s3deploy.BucketDeployment(this, "WebsiteDeploy", {
      sources: [
        s3deploy.Source.asset(`${path.resolve(__dirname)}/../../web/build`),
      ],
      destinationBucket: websiteBucket,
      distribution: websiteDistribution,
      distributionPaths: ["/*"],
      memoryLimit: 1024,
    });

    new cdk.CfnOutput(this, "endpoint", {
      description: "Frontend Endpoint",
      value: websiteDistribution.distributionDomainName,
    });
  }
}

interface SsmParameterReaderProps {
  parameterName: string;
  region: string;
}

class SsmParameterReader extends cdk.Construct {
  private reader: customResources.AwsCustomResource;

  get stringValue(): string {
    return this.getParameterValue();
  }

  constructor(
    scope: cdk.Construct,
    name: string,
    props: SsmParameterReaderProps
  ) {
    super(scope, name);

    const { parameterName, region } = props;

    const customResource = new customResources.AwsCustomResource(
      scope,
      `${name}CustomResource`,
      {
        policy: customResources.AwsCustomResourcePolicy.fromStatements([
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["ssm:GetParameter*"],
            resources: [
              cdk.Stack.of(this).formatArn({
                service: "ssm",
                region,
                resource: "parameter",
                resourceName: parameterName.replace(/^\/+/, ""),
              }),
            ],
          }),
        ]),
        onUpdate: {
          service: "SSM",
          action: "getParameter",
          parameters: {
            Name: parameterName,
          },
          region,
          physicalResourceId: customResources.PhysicalResourceId.of(
            Date.now().toString()
          ),
        },
      }
    );

    this.reader = customResource;
  }

  private getParameterValue(): string {
    return this.reader.getResponseField("Parameter.Value");
  }
}
