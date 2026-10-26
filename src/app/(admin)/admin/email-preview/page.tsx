import { Suspense } from "react";
import { adminUser } from "@/server/admin/guard";
import { AdminSkeleton, PageHeader } from "@/components/admin/ui";
import { EmailPreviewClient } from "./EmailPreviewClient";
import {
  otpEmail,
  orderConfirmedEmail,
  orderShippedEmail,
  orderDeliveredEmail,
  orderCancelledEmail,
  returnUpdateEmail,
  passwordResetEmail,
  backInStockEmail,
  reviewRequestEmail,
  questionAnsweredEmail,
} from "@/server/email/templates";

export const metadata = { title: "Email templates preview" };

export default function Page() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <EmailPreview />
    </Suspense>
  );
}

async function EmailPreview() {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can preview templates.</p>;

  const mockOrder = {
    orderId: "AQ-260101-8842",
    name: "Aarav Sharma",
    email: "aarav@example.com",
    totalP: 349900,
    paymentMethod: "razorpay" as const,
    items: [
      { name: "Ember Crown", variantLabel: "50 ml Extrait", qty: 1, lineTotalP: 299900 },
      { name: "Signature Discovery Set", variantLabel: "5 × 5 ml", qty: 1, lineTotalP: 50000 },
    ],
    url: "https://aaliqadr.com/orders/AQ-260101-8842",
  };

  const templates = [
    {
      id: "otp",
      label: "Sign-in OTP",
      mail: otpEmail("aarav@example.com", "849201"),
    },
    {
      id: "order_confirmed",
      label: "Order Confirmed",
      mail: orderConfirmedEmail(mockOrder),
    },
    {
      id: "order_shipped",
      label: "Order Shipped",
      mail: orderShippedEmail({
        ...mockOrder,
        courier: "BlueDart Express",
        awb: "BD992817401IN",
        trackingUrl: "https://bluedart.com/track/BD992817401IN",
      }),
    },
    {
      id: "order_delivered",
      label: "Order Delivered",
      mail: orderDeliveredEmail(mockOrder),
    },
    {
      id: "order_cancelled",
      label: "Order Cancelled",
      mail: orderCancelledEmail({ ...mockOrder, refunded: true }),
    },
    {
      id: "return_update",
      label: "Return / Claim Update",
      mail: returnUpdateEmail({
        id: "RT-100234",
        orderId: mockOrder.orderId,
        name: mockOrder.name,
        email: mockOrder.email,
        status: "approved",
        note: "Replacement perfume has been dispatched via BlueDart.",
        url: mockOrder.url,
      }),
    },
    {
      id: "password_reset",
      label: "Password Reset",
      mail: passwordResetEmail("aarav@example.com", "https://aaliqadr.com/reset-password?token=mocktoken"),
    },
    {
      id: "question_answered",
      label: "Product Q&A Answered",
      mail: questionAnsweredEmail("aarav@example.com", {
        product: "Ember Crown",
        question: "Is this suitable for warm monsoon evenings?",
        answer: "Yes, the heart notes of saffron and cedar bloom beautifully in humid weather without overpowering.",
        url: "https://aaliqadr.com/products/ember-crown",
      }),
    },
    {
      id: "review_request",
      label: "Review Request",
      mail: reviewRequestEmail("aarav@example.com", {
        name: mockOrder.name,
        products: ["Ember Crown", "Signature Discovery Set"],
        url: "https://aaliqadr.com/account/reviews",
      }),
    },
    {
      id: "restock",
      label: "Restock Notification",
      mail: backInStockEmail("aarav@example.com", {
        name: "Saffron Oud Imperial",
        variant: "100 ml",
        url: "https://aaliqadr.com/products/saffron-oud-imperial",
      }),
    },
  ];

  return (
    <>
      <PageHeader
        title="Email templates"
        description="Preview how transactional emails look across customer inboxes."
      />
      <EmailPreviewClient templates={templates} />
    </>
  );
}
