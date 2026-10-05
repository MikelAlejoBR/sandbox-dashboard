import AnsibleIcon from "../../assets/logos/ansible.svg";
import DevSpacesIcon from "../../assets/logos/devspaces.svg";
import OpenClawIcon from "../../assets/logos/openclaw.svg";
import OpenShiftIcon from "../../assets/logos/openshift.svg";
import OpenShiftAIIcon from "../../assets/logos/openshift-ai.svg";
import OpenshiftVirtualizationIcon from "../../assets/logos/openshift-virtualization.svg";
import RHDHIcon from "../../assets/logos/rhdh_logo.svg";
import {
  BulletPointIconType,
  type Product,
  ProductType,
  type URLTemplateVars,
} from "../../types/product";

export const Intcmp: Record<string, string> = {
  [ProductType.OPENSHIFT_CONSOLE]: "701Pe00000dnCEYIA2",
  [ProductType.DEVSPACES]: "701Pe00000doTQCIA2",
  [ProductType.OPENSHIFT_AI]: "701Pe00000do2uiIAA",
  [ProductType.OPENSHIFT_VIRTUALIZATION]: "701Pe00000dov6IIAQ",
  [ProductType.AAP]: "701Pe00000dowQXIAY",
  [ProductType.OPENCLAW]: "",
};

export const products: Product[] = [
  {
    type: ProductType.OPENSHIFT_CONSOLE,
    title: "OpenShift",
    image: OpenShiftIcon,
    urlTemplate: "{{consoleURL}}/k8s/cluster/projects/{{defaultUserNamespace}}",
    landingPage: {
      productDescription:
        "Comprehensive cloud-native application platform for developing, deploying and managing containerized applications.",
    },
    description: [
      {
        bulletPoint: "Comprehensive cloud-native application platform",
      },
      {
        bulletPoint: "Consistently develop and deploy applications at scale",
      },
      {
        bulletPoint: "Streamline application development with CI/CD tools",
      },
      {
        bulletPoint:
          "Manage containers, VMs, and serverless workloads across the hybrid cloud",
      },
    ],
  },
  {
    type: ProductType.OPENSHIFT_AI,
    title: "OpenShift AI",
    image: OpenShiftAIIcon,
    urlTemplate: "{{rhodsMemberURL}}",
    landingPage: {
      productDescription:
        "Flexible hybrid cloud platform to deploy open weight models and autonomous agents at scale.",
    },
    description: [
      {
        bulletPoint: "Scalable AI and ML platform",
      },
      {
        bulletPoint: "Optimized for AI workloads",
      },
      {
        bulletPoint: "Train, serve and monitor models",
      },
      {
        bulletPoint: "Supports predictive and generative AI",
      },
      {
        bulletPoint: "Scales across the hybrid cloud",
      },
    ],
  },
  {
    type: ProductType.DEVSPACES,
    title: "Dev Spaces",
    image: DevSpacesIcon,
    resolveURL: (urlTemplateVars: URLTemplateVars): string => {
      // Prefer the given "Che Dashboard" url from the user signup.
      if (urlTemplateVars.cheDashboardURL) {
        return urlTemplateVars.cheDashboardURL;
      }

      // Otherwise, derive the Dev Spaces URL from the Console URL. Basically
      // obtain the OpenShift domain and use it by prepending "devspaces" to
      // it.
      //
      // - https://console-openshift-console.apps.cluster1.example.com
      // - https://devspaces.apps.cluster1.example.com.
      if (!urlTemplateVars.consoleURL) {
        return "";
      }

      const index = urlTemplateVars.consoleURL.indexOf(".apps");
      if (index === -1) {
        return "";
      }

      return `https://devspaces${urlTemplateVars.consoleURL.substring(index)}`;
    },
    landingPage: {
      productDescription:
        "Consistent, secure and zero-configuration cloud development environment for teams.",
    },
    description: [
      {
        bulletPoint: "Cloud Development Environment",
      },
      {
        bulletPoint: "Developer workspaces defined as code",
      },
      {
        bulletPoint: "Kubernetes development made easy",
      },
      {
        bulletPoint: "Near instant onboarding",
      },
      {
        bulletPoint: "VS Code and JetBrains IDEs",
      },
    ],
  },
  {
    type: ProductType.AAP,
    title: "Ansible Automation Platform",
    image: AnsibleIcon,
    landingPage: {
      productDescription:
        "Scalable, centralized and enterprise-grade framework for IT automation.",
    },
    description: [
      {
        bulletPoint: "Scalable, centralized automation solution",
      },
      {
        bulletPoint: "Available on-prem, cloud, and hybrid",
      },
      {
        bulletPoint: "Manage and monitor workflows, content, and execution",
      },
      {
        bulletPoint: "Enforce policies and consistent configurations",
      },
      {
        bulletPoint: "50-minute environment provisioning",
        iconType: BulletPointIconType.WARNING,
      },
    ],
  },
  {
    type: ProductType.OPENSHIFT_VIRTUALIZATION,
    title: "OpenShift Virtualization",
    image: OpenshiftVirtualizationIcon,
    urlTemplate:
      "{{consoleURL}}/k8s/ns/{{defaultUserNamespace}}/virtualization-overview",
    landingPage: {
      productDescription:
        "A unified platform that lets you migrate, run and manage traditional virtual machines along with the power of OpenShift's container orchestration platform.",
    },
    description: [
      {
        bulletPoint: "Migrate traditional VM workloads to OpenShift",
      },
      {
        bulletPoint:
          "Unified platform for VMs, containers, and serverless workloads",
      },
      {
        bulletPoint: "Supports modernizing application development",
      },
      {
        bulletPoint: "Comprehensive development and operations tools",
      },
    ],
  },
  {
    type: ProductType.OPENCLAW,
    title: "OpenClaw",
    image: OpenClawIcon,
    landingPage: {
      isShownInLandingPage: false,
    },
    description: [
      {
        bulletPoint: "Personal AI assistant running on your cluster",
      },
      {
        bulletPoint:
          "Bring your own LLM API keys (OpenAI, Anthropic, Google, etc.)",
      },
      {
        bulletPoint: "Full workspace access — code, debug, and deploy",
      },
      {
        bulletPoint: "Kubernetes-native with managed lifecycle",
      },
      {
        bulletPoint: "Requires at least one AI provider credential",
        iconType: BulletPointIconType.WARNING,
      },
    ],
  },
  {
    type: ProductType.RHDH,
    title: "Red Hat Developer Hub",
    image: RHDHIcon,
    landingPage: {
      productDescription: "Enterprise-grade internal developer portal.",
    },
    resolveURL: (urlTemplateVars: URLTemplateVars): string => {
      // Derive RHDH's URL from the cluster's URL.
      //
      // - https://console-openshift-console.apps.cluster1.example.com
      // - https://backstage-developer-hub-rhdh-operator.apps.cluster1.example.com.
      if (!urlTemplateVars.consoleURL) {
        return "";
      }

      const index = urlTemplateVars.consoleURL.indexOf(".apps");
      if (index === -1) {
        return "";
      }

      return `https://backstage-developer-hub-rhdh-operator${urlTemplateVars.consoleURL.substring(index)}`;
    },
    description: [
      {
        bulletPoint:
          "Backstage-based internal developer portal built for enterprises",
      },
      { bulletPoint: "Streamline development workflows" },
      {
        bulletPoint:
          "Improve developer collaboration and accelerate innovation",
      },
    ],
  },
];
