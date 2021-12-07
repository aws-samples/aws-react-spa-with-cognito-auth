import * as cdk from "@aws-cdk/core";
import * as ssm from "@aws-cdk/aws-ssm";
import * as waf from "@aws-cdk/aws-wafv2";

export class WebAclStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);
    const ipRanges: string[] = scope.node.tryGetContext(
      "allowedIpAddressRanges"
    );

    const ipRangesV6: string[] = scope.node.tryGetContext(
      "allowedIpAddressRangesV6"
    );

    const wafIPSet4 = new waf.CfnIPSet(this, `IPSet4`, {
      name: "FrontendWebAclIpSet4",
      ipAddressVersion: "IPV4",
      scope: "CLOUDFRONT",
      addresses: ipRanges,
    });

    const wafIPSet6 = new waf.CfnIPSet(this, `IPSet6`, {
      name: "FrontendWebAclIpSet6",
      ipAddressVersion: "IPV6",
      scope: "CLOUDFRONT",
      addresses: ipRangesV6,
    });

    const frontendWaf = new waf.CfnWebACL(this, "waf", {
      defaultAction: { block: {} },
      scope: "CLOUDFRONT",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        sampledRequestsEnabled: true,
        metricName: "FrontendWAF",
      },
      rules: [
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
        {
          priority: 2,
          name: "FrontendWebAclIpRuleSet",
          action: { allow: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "FrontendWebAclIpRuleSet",
          },
          statement: {
            ipSetReferenceStatement: {
              arn: wafIPSet4.attrArn,
            },
          },
        },
        {
          priority: 3,
          name: "FrontendWebAclIpV6RuleSet",
          action: { allow: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "FrontendWebAclIpV6RuleSet",
          },
          statement: {
            ipSetReferenceStatement: {
              arn: wafIPSet6.attrArn,
            },
          },
        },
      ],
    });

    new ssm.StringParameter(this, "WebAclArnParameter", {
      parameterName: "WebAclArnParameter",
      stringValue: frontendWaf.attrArn,
    });
  }
}
