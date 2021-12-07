#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { WebAclStack } from "../lib/web-acl-stack";
import { FrontendStack } from "../lib/frontend-stack";

const app = new cdk.App();
const waf = new WebAclStack(app, "FrontendWebAclStack", {
  env: {
    region: "us-east-1",
  },
});

new FrontendStack(app, "FrontendStack").addDependency(waf);
