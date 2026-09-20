import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Cookie Policy — Ledgr",
  description: "How Ledgr uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <LegalDocument
      title="Cookie Policy"
      updated="August 28, 2026"
      intro="This Cookie Policy explains what cookies are, how Ledgr uses them, and how you can control them. It applies to the Ledgr website and service at ledgr.dev."
      sections={[
        {
          heading: "What Are Cookies",
          paragraphs: [
            "Cookies are small text files stored on your device when you visit a website. They are widely used to make websites work efficiently and to provide information to the site owners. Cookies can be &quot;session&quot; cookies (deleted when you close your browser) or &quot;persistent&quot; cookies (which remain until they expire or are deleted).",
          ],
        },
        {
          heading: "How We Use Cookies",
          paragraphs: [
            "We use cookies for the following purposes:",
          ],
          items: [
            "Authentication and security — keeping you signed in and protecting your account",
            "Preferences — remembering your settings, such as your preferred theme and currency",
            "Analytics and performance — understanding how the service is used so we can improve it",
          ],
        },
        {
          heading: "Essential Cookies",
          paragraphs: [
            "Some cookies are essential for the service to function. These include session cookies that keep you signed in and security cookies that help prevent abuse. These cookies cannot be disabled from within the service, but you can block them through your browser settings.",
            "Our authentication cookie is named ledgr.session_token. It is a Secure, HttpOnly cookie used to identify your session.",
          ],
        },
        {
          heading: "How to Control Cookies",
          paragraphs: [
            "You can set your browser to refuse all or some browser cookies, or to alert you when websites set or access cookies. If you disable or refuse cookies, some parts of the service may become inaccessible or not function properly.",
            "Most web browsers allow you to manage cookies through their settings menus. You can also use tools like the browser's private or incognito mode, which typically uses temporary session cookies.",
          ],
        },
        {
          heading: "Changes to This Policy",
          paragraphs: [
            "We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated revision date. We encourage you to review this policy periodically.",
          ],
        },
        {
          heading: "Contact Us",
          paragraphs: [
            "If you have questions about our use of cookies, please contact us at support@ledgr.dev.",
          ],
        },
      ]}
    />
  );
}