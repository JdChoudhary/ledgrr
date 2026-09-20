import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Terms of Service — Ledgr",
  description: "The terms and conditions governing your use of Ledgr.",
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      updated="August 28, 2026"
      intro="These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Ledgr service and website at ledgr.dev. By creating an account or using Ledgr, you agree to be bound by these Terms."
      sections={[
        {
          heading: "Acceptance of Terms",
          paragraphs: [
            "By accessing or using Ledgr, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not use the service.",
          ],
        },
        {
          heading: "Eligibility",
          paragraphs: [
            "You must be at least 16 years old to use Ledgr. By using the service, you represent and warrant that you meet this eligibility requirement and that you have the authority to accept these Terms on behalf of yourself or the entity you represent.",
          ],
        },
        {
          heading: "Your Account",
          paragraphs: [
            "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorized use of your account.",
            "You must provide accurate and complete information when creating an account and keep it up to date. You may not create multiple accounts for the purpose of circumventing our rules.",
          ],
        },
        {
          heading: "Acceptable Use",
          paragraphs: [
            "You agree not to use Ledgr in any way that:",
          ],
          items: [
            "Violates any applicable law or regulation",
            "Infringes the rights of others, including intellectual property rights",
            "Attempts to gain unauthorized access to any part of the service or other users' accounts",
            "Introduces malware, viruses, or other harmful code",
            "Interferes with or disrupts the operation of the service",
            "Submits false, misleading, or fraudulent information",
          ],
        },
        {
          heading: "Your Financial Data",
          paragraphs: [
            "Ledgr is a tool for tracking and visualizing financial information that you provide. You are solely responsible for the accuracy and completeness of the data you enter, and for the decisions you make based on it.",
            "We do not provide investment, legal, or tax advice. Any recommendations, insights, or forecasts shown in the service are informational only and do not constitute professional advice. You should consult a qualified professional before making significant financial decisions.",
          ],
        },
        {
          heading: "Intellectual Property",
          paragraphs: [
            "Ledgr and its original content, features, and functionality are and will remain the exclusive property of Ledgr and its licensors. The service is protected by copyright, trademark, and other laws. You may not copy, modify, distribute, sell, or lease any part of the service without our prior written consent.",
          ],
        },
        {
          heading: "Third-Party Services",
          paragraphs: [
            "The service may integrate with or link to third-party services, such as financial institutions or identity providers. We are not responsible for the content, policies, or practices of any third-party services. Your use of third-party services is subject to their own terms and policies.",
          ],
        },
        {
          heading: "Disclaimers",
          paragraphs: [
            "Ledgr is provided on an &quot;as is&quot; and &quot;as available&quot; basis, without warranties of any kind, either express or implied, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.",
            "We do not warrant that the service will be uninterrupted, error-free, or free of harmful components, or that the information provided will always be accurate or up to date.",
          ],
        },
        {
          heading: "Limitation of Liability",
          paragraphs: [
            "To the maximum extent permitted by applicable law, Ledgr shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or goodwill, arising out of or related to your use of the service.",
            "Our total liability for any claims arising under these Terms shall not exceed the amount you paid to us in the twelve months preceding the claim, or $100, whichever is greater.",
          ],
        },
        {
          heading: "Indemnification",
          paragraphs: [
            "You agree to indemnify and hold harmless Ledgr and its affiliates, officers, agents, and employees from any claims, damages, liabilities, and expenses arising out of your use of the service, your violation of these Terms, or your violation of any rights of a third party.",
          ],
        },
        {
          heading: "Termination",
          paragraphs: [
            "We may suspend or terminate your access to the service at any time, with or without cause or notice, if we believe you have violated these Terms or that your continued use would harm the service or other users.",
            "You may stop using the service or delete your account at any time. Certain provisions of these Terms will survive any termination, including those relating to intellectual property, disclaimers, limitation of liability, and indemnification.",
          ],
        },
        {
          heading: "Governing Law",
          paragraphs: [
            "These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Ledgr's principal place of business is located, without regard to its conflict of law provisions. Any disputes shall be subject to the exclusive jurisdiction of the courts in that jurisdiction.",
          ],
        },
        {
          heading: "Changes to These Terms",
          paragraphs: [
            "We may revise these Terms from time to time. When we make material changes, we will post the updated Terms on this page and update the &quot;Last updated&quot; date. Your continued use of the service after changes take effect constitutes acceptance of the revised Terms.",
          ],
        },
        {
          heading: "Contact Us",
          paragraphs: [
            "If you have any questions about these Terms, please contact us at support@ledgr.dev.",
          ],
        },
      ]}
    />
  );
}