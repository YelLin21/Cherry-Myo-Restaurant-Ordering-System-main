import React, { useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import Swal from "sweetalert2";

const APIBASE = import.meta.env.VITE_API_URL;

export default function CardPaymentForm({ totalPrice, orderId, onClose }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleCardPayment = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      const response = await fetch(`${APIBASE}/stripe/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalPrice * 100 }), // convert to cents
      });

      const { clientSecret } = await response.json();

      if (!clientSecret) {
        throw new Error("Failed to get client secret from server.");
      }

      // 2️⃣ Confirm card payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (result.error) {
        Swal.fire("Payment Failed", result.error.message, "error");
      } else if (result.paymentIntent.status === "succeeded") {
        await fetch(`${APIBASE}/orders/${orderId}/paid`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        });

        onClose();
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCardPayment} className="space-y-4 p-6">
      <div className="p-4 border rounded-xl bg-gray-50 dark:bg-gray-700">
        <p className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
          💳 Enter Card Details
        </p>
        <div className="border p-3 rounded-lg bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#32325d",
                  "::placeholder": { color: "#a0aec0" },
                },
                invalid: { color: "#fa755a" },
              },
              postalCode: true,
            }}
          />
        </div>
      </div>

      <button
        disabled={!stripe || loading}
        className="w-full py-3 px-6 rounded-xl font-bold text-lg bg-green-600 hover:bg-green-700 text-white"
      >
        {loading
          ? "Processing..."
          : `Pay ${totalPrice.toLocaleString("en-US")} MMK`}
      </button>
    </form>
  );
}
