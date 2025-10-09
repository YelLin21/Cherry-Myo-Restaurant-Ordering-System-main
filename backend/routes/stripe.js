import express from "express";
import Stripe from "stripe";

const router = express.Router();

// Use the Stripe constructor with your secret key (not a string)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51QDrLfLUvxdBWUIqUIWhzBCRAo6mwBV6QgnequKGw9WXpafauP1Z8qSYONIBXlT3zcsUxZ0VlRpdKobzn7yK1v7400vaIufjgo'); 

router.post("/create-payment-intent", async (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount) return res.status(400).json({ error: "Amount is required" });
  
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // convert THB to satang
        currency: "thb",
        automatic_payment_methods: { enabled: true },
      });
  
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  

export default router;
