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

   Authentication required
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

   NO JWT AUTH HERE

   PayHere itself calls this endpoint.
============================================================= */

router.post(
    "/notify",
    payHereNotify
);


export default router;