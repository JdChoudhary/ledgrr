import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy — Ledgr",
  description: "How Ledgr collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      updated="August 28, 2026"
      intro="This Privacy Policy explains how Ledgr (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, stores, and protects your personal information when you use our service at ledgr.dev. By using Ledgr, you agree to the practices described in this policy."
      sections={[
        {
          heading: "Information We Collect",
          paragraphs: [
            "We collect information you provide directly to us, including your name, email address, username, and password when you create an account. We also collect financial data you enter into the service, such as transactions, account balances, budgets, and savings goals.",
            "When you sign in with a third-party provider such as Google, we collect the profile information that provider shares with us, such as your name and email address.",
            "We automatically collect certain technical information when you use Ledgr, including your IP address, browser type, device information, and usage data such as pages visited and features used.",
          ],
        },
        {
          heading: "How We Use Your Information",
          paragraphs: [
            "We use the information we collect to provide, maintain, and improve Ledgr, including:",
          ],
          items: [
            "Creating and managing your account",
            "Processing and displaying your financial data",
            "Sending service emails such as verification and password reset notices",
            "Detecting, preventing, and addressing technical issues and security threats",
            "Improving our product and developing new features",
            "Communicating with you about our service",
          ],
        },
        {
          heading: "How We Share Your Information",
          paragraphs: [
            "We do not sell your personal information or your financial data. We share information only in the following circumstances:",
          ],
          items: [
            "With service providers who help us operate Ledgr (such as hosting providers and email services), subject to confidentiality obligations",
            "When required by law, regulation, or enforceable government request",
            "To protect the rights, property, or safety of Ledgr, our users, or the public",
            "In connection with a merger, acquisition, or sale of assets, with notice to you",
          ],
        },
        {
          heading: "Data Storage and Security",
          paragraphs: [
            "We store your data on secure servers and use industry-standard encryption to protect data in transit and at rest. We restrict access to your personal information to employees and contractors who need it to provide the service.",
            "While we take reasonable measures to protect your information, no method of transmission over the internet or method of electronic storage is completely secure. We cannot guarantee absolute security.",
          ],
        },
        {
          heading: "Cookies and Similar Technologies",
          paragraphs: [
            "We use cookies and similar technologies to keep you signed in, remember your preferences, and understand how you use Ledgr. You can control cookies through your browser settings. For more detail, see our Cookie Policy.",
          ],
        },
        {
          heading: "Your Rights and Choices",
          paragraphs: [
            "Depending on your location, you may have the right to access, correct, delete, or port your personal information, and to object to or restrict certain processing. You can update your profile information in your account settings at any time.",
            "You may also export your data, delete your account, or contact us to exercise any of your rights. We will respond to requests within the timeframe required by applicable law.",
          ],
        },
        {
          heading: "Data Retention",
          paragraphs: [
            "We retain your personal information for as long as your account is active or as needed to provide the service, comply with legal obligations, resolve disputes, and enforce our agreements. When you delete your account, we delete or anonymize your data within a reasonable timeframe, except where we are required to retain it by law.",
          ],
        },
        {
          heading: "Children's Privacy",
          paragraphs: [
            "Ledgr is not intended for children under the age of 16. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, contact us and we will take steps to delete it.",
          ],
        },
        {
          heading: "International Data Transfers",
          paragraphs: [
            "Your information may be processed in countries other than your own, including the United States. We take steps to ensure that your information is treated securely and in accordance with this Privacy Policy wherever it is processed.",
          ],
        },
        {
          heading: "Your California Privacy Rights",
          paragraphs: [
            "If you are a California resident, you have specific rights under the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA), including the right to know what personal information we collect and how we use it, the right to request deletion, and the right to non-discrimination for exercising your privacy rights.",
          ],
        },
        {
          heading: "Changes to This Policy",
          paragraphs: [
            "We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. We encourage you to review this policy periodically.",
          ],
        },
        {
          heading: "Contact Us",
          paragraphs: [
            "If you have questions about this Privacy Policy or our privacy practices, please contact us at support@ledgr.dev.",
          ],
        },
      ]}
    />
  );
}