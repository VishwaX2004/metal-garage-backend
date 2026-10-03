import express from "express";

import {
    authMiddleware,
} from "./userRouter.js";

import {
    createOrder,
    getMyOrders,
    getOrderByID,
    deleteOrder,
    getAllOrdersAdmin,
    updateOrderStatusAdmin,
} from "../controllers/orderController.js";


const router =
    express.Router();


/*
 * IMPORTANT:
 * මෙතන ඔයාගේ existing authentication middleware
 * එක use කරන්න.
 *
 * උදාහරණ:
 *
 * import authMiddleware from "../middleware/authMiddleware.js";
 */


/* =============================================================
   CREATE ORDER
============================================================= */

router.post(
    "/",
    authMiddleware,
    createOrder
);


/* =============================================================
   MY ORDERS
============================================================= */

router.get(
    "/my-orders",
    getMyOrders
);


/* =============================================================
   ADMIN ALL ORDERS
============================================================= */

router.get(
    "/admin/all",
    getAllOrdersAdmin
);


/* =============================================================
   ADMIN UPDATE ORDER
============================================================= */

router.put(
    "/admin/:orderID/status",
    updateOrderStatusAdmin
);


/* =============================================================
   SINGLE ORDER
============================================================= */

router.get(
    "/:orderID",
    authMiddleware,
    getOrderByID
);


/* =============================================================
   DELETE ORDER
============================================================= */

router.delete(
    "/:orderID",
    deleteOrder
);


export default router;