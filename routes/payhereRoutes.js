import express from "express";

import {
    authenticatePayHereUser,
    createPayHerePayment,
    payHereNotify,
} from "../controllers/payhereController.js";

const router =
    express.Router();

/* =============================================================
   CREATE PAYHERE PAYMENT

   POST
   /api/payments/payhere/create

   JWT authentication required.
============================================================= */

router.post(
    "/create",
    authenticatePayHereUser,
    createPayHerePayment
);

/* =============================================================
   PAYHERE NOTIFICATION

   POST
   /api/payments/payhere/notify

   NO JWT AUTHENTICATION.

   PayHere calls this endpoint directly.
============================================================= */

router.post(
    "/notify",
    payHereNotify
);

export default router;