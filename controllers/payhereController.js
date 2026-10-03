import crypto from "crypto";
import jwt from "jsonwebtoken";

import Order from "../models/order.js";
import Product from "../models/product.js";

/* =============================================================
   PAYHERE CONFIG
============================================================= */

const PAYHERE_ACTION_URL =
    "https://sandbox.payhere.lk/pay/checkout";

const CURRENCY = "LKR";

/* =============================================================
   HELPERS
============================================================= */

function md5(value) {
    return crypto
        .createHash("md5")
        .update(String(value), "utf8")
        .digest("hex");
}

/*
    PayHere Checkout hash:

    hash =
    UPPERCASE(
        MD5(
            merchant_id +
            order_id +
            amount +
            currency +
            UPPERCASE(MD5(merchant_secret))
        )
    )

    IMPORTANT:
    Hash must be generated on backend only.
*/
function generatePayHereHash({
    merchantId,
    orderId,
    amount,
    currency,
    merchantSecret,
}) {
    const formattedAmount = Number(amount).toFixed(2);

    const hashedSecret = md5(
        merchantSecret
    ).toUpperCase();

    const hashString =
        String(merchantId) +
        String(orderId) +
        formattedAmount +
        String(currency) +
        hashedSecret;

    return md5(hashString).toUpperCase();
}

function getTokenFromRequest(req) {
    const header = req.headers.authorization;

    if (
        !header ||
        !header.startsWith("Bearer ")
    ) {
        return null;
    }

    return header.substring(7);
}

function getUserIDFromToken(req) {
    return (
        req.user?.userID ||
        req.user?.userId ||
        req.user?.id ||
        req.user?._id ||
        null
    );
}

/* =============================================================
   AUTHENTICATION
============================================================= */

export function authenticatePayHereUser(
    req,
    res,
    next
) {
    try {
        const token =
            getTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message:
                    "Authentication token is required.",
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error(
                "JWT_SECRET is missing."
            );

            return res.status(500).json({
                success: false,
                message:
                    "Server authentication configuration is missing.",
            });
        }

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        req.user = decoded;

        next();
    } catch (error) {
        console.error(
            "PayHere auth error:",
            error
        );

        return res.status(401).json({
            success: false,
            message:
                "Invalid or expired authentication token.",
        });
    }
}

/* =============================================================
   CREATE PAYHERE PAYMENT

   POST
   /api/payments/payhere/create

============================================================= */

export async function createPayHerePayment(
    req,
    res
) {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message:
                    "Order ID is required.",
            });
        }

        const userID =
            getUserIDFromToken(req);

        if (!userID) {
            return res.status(401).json({
                success: false,
                message:
                    "User authentication is required.",
            });
        }

        /* =====================================================
           FIND ORDER
        ===================================================== */

        const order =
            await Order.findOne({
                orderID: String(orderId),
                userID: String(userID),
            });

        if (!order) {
            return res.status(404).json({
                success: false,
                message:
                    "Order not found or you do not have permission to pay for this order.",
            });
        }

        /* =====================================================
           VALIDATE PAYMENT METHOD
        ===================================================== */

        if (
            order.paymentMethod !==
            "PayHere"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "This order is not configured for PayHere.",
            });
        }

        /* =====================================================
           VALIDATE PAYMENT STATUS
        ===================================================== */

        if (
            order.paymentStatus ===
            "Paid"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "This order has already been paid.",
            });
        }

        if (
            order.paymentStatus !==
            "Pending"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "This order is not available for payment.",
            });
        }

        /* =====================================================
           PAYHERE ENVIRONMENT
        ===================================================== */

        const merchantId =
            process.env.PAYHERE_MERCHANT_ID;

        const merchantSecret =
            process.env.PAYHERE_MERCHANT_SECRET;

        const notifyUrl =
            process.env.PAYHERE_NOTIFY_URL;

        const frontendUrl =
            process.env.FRONTEND_URL ||
            "https://metal-garage.vercel.app";

        const returnUrl =
            process.env.PAYHERE_RETURN_URL ||
            `${frontendUrl.replace(/\/+$/, "")}/payment/success`;

        const cancelUrl =
            process.env.PAYHERE_CANCEL_URL ||
            `${frontendUrl.replace(/\/+$/, "")}/payment/cancel`;

        /* =====================================================
           ENV VALIDATION
        ===================================================== */

        if (!merchantId) {
            console.error(
                "PAYHERE_MERCHANT_ID is missing."
            );

            return res.status(500).json({
                success: false,
                message:
                    "PayHere Merchant ID is not configured.",
            });
        }

        if (!merchantSecret) {
            console.error(
                "PAYHERE_MERCHANT_SECRET is missing."
            );

            return res.status(500).json({
                success: false,
                message:
                    "PayHere Merchant Secret is not configured.",
            });
        }

        if (!notifyUrl) {
            console.error(
                "PAYHERE_NOTIFY_URL is missing."
            );

            return res.status(500).json({
                success: false,
                message:
                    "PayHere notification URL is not configured.",
            });
        }

        /* =====================================================
           CUSTOMER
        ===================================================== */

        const shippingAddress =
            order.shippingAddress || {};

        const fullName =
            String(
                shippingAddress.fullName ||
                    ""
            ).trim();

        const nameParts =
            fullName
                ? fullName.split(/\s+/)
                : [];

        const firstName =
            nameParts.shift() ||
            "Customer";

        const lastName =
            nameParts.join(" ") ||
            "Customer";

        const email =
            String(
                shippingAddress.email ||
                    order.customerEmail ||
                    ""
            ).trim();

        const phone =
            String(
                shippingAddress.phone ||
                    ""
            ).trim();

        const address =
            String(
                shippingAddress.address ||
                    ""
            ).trim();

        const city =
            String(
                shippingAddress.city ||
                    ""
            ).trim();

        /* =====================================================
           VALIDATE CUSTOMER DATA
        ===================================================== */

        if (!email) {
            return res.status(400).json({
                success: false,
                message:
                    "Customer email is required for PayHere.",
            });
        }

        if (!phone) {
            return res.status(400).json({
                success: false,
                message:
                    "Customer phone number is required for PayHere.",
            });
        }

        if (!address) {
            return res.status(400).json({
                success: false,
                message:
                    "Customer address is required for PayHere.",
            });
        }

        if (!city) {
            return res.status(400).json({
                success: false,
                message:
                    "Customer city is required for PayHere.",
            });
        }

        /* =====================================================
           AMOUNT

           IMPORTANT:
           The amount used here MUST be exactly the same
           amount used when generating the PayHere hash.
        ===================================================== */

        const amount =
            Number(order.total).toFixed(2);

        if (
            !Number.isFinite(
                Number(order.total)
            ) ||
            Number(order.total) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid order total.",
            });
        }

        /* =====================================================
           ORDER ID
        ===================================================== */

        const payHereOrderId =
            String(order.orderID).trim();

        if (!payHereOrderId) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid order ID.",
            });
        }

        /* =====================================================
           HASH
        ===================================================== */

        const hash =
            generatePayHereHash({
                merchantId,
                orderId: payHereOrderId,
                amount,
                currency: CURRENCY,
                merchantSecret,
            });

        /* =====================================================
           ITEM DESCRIPTION
        ===================================================== */

        const items =
            Array.isArray(order.items)
                ? order.items
                      .map((item) => {
                          const name =
                              String(
                                  item.name ||
                                      "Product"
                              ).trim();

                          const quantity =
                              Number(
                                  item.quantity
                              ) || 1;

                          return `${name} x${quantity}`;
                      })
                      .join(", ")
                : "";

        /* =====================================================
           PAYHERE PAYMENT DATA
        ===================================================== */

        const payment = {
            action:
                PAYHERE_ACTION_URL,

            merchant_id:
                String(merchantId),

            return_url:
                returnUrl,

            cancel_url:
                cancelUrl,

            notify_url:
                notifyUrl,

            first_name:
                firstName,

            last_name:
                lastName,

            email,

            phone,

            address,

            city,

            country:
                "Sri Lanka",

            order_id:
                payHereOrderId,

            items:
                items ||
                `Metal Garage Order ${payHereOrderId}`,

            currency:
                CURRENCY,

            amount,

            hash,

            delivery_address:
                address,

            delivery_city:
                city,

            delivery_country:
                "Sri Lanka",
        };

        /* =====================================================
           DEBUG LOG

           DO NOT log merchantSecret.
        ===================================================== */

        console.log(
            "PayHere payment created:",
            {
                merchantId,
                orderId:
                    payHereOrderId,
                amount,
                currency:
                    CURRENCY,
                action:
                    PAYHERE_ACTION_URL,
                notifyUrl,
                returnUrl,
                cancelUrl,
                hash,
            }
        );

        return res.status(200).json({
            success: true,
            payment,
        });
    } catch (error) {
        console.error(
            "Create PayHere payment error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to start PayHere payment.",
        });
    }
}

/* =============================================================
   RELEASE ORDER STOCK
============================================================= */

async function releaseOrderStock(order) {
    if (order.stockReleased) {
        return;
    }

    for (const item of order.items) {
        const product =
            await Product.findOneAndUpdate(
                {
                    productID:
                        item.productID,
                },
                {
                    $inc: {
                        quantity:
                            Number(
                                item.quantity
                            ) || 0,
                    },
                },
                {
                    new: true,
                }
            );

        if (!product) {
            continue;
        }

        const quantity =
            Number(
                product.quantity
            ) || 0;

        await Product.findOneAndUpdate(
            {
                productID:
                    item.productID,
            },
            {
                $set: {
                    quantity,
                    inStock:
                        quantity > 0,
                    status:
                        quantity > 0
                            ? "Active"
                            : "Out of Stock",
                },
            }
        );
    }

    order.stockReleased = true;

    await order.save();
}

/* =============================================================
   PAYHERE NOTIFICATION

   POST
   /api/payments/payhere/notify

   IMPORTANT:
   This endpoint must NOT use JWT authentication.
============================================================= */

export async function payHereNotify(
    req,
    res
) {
    try {
        console.log(
            "================================"
        );

        console.log(
            "PAYHERE NOTIFICATION RECEIVED"
        );

        console.log(
            req.body
        );

        console.log(
            "================================"
        );

        const {
            merchant_id,
            order_id,
            payment_id,
            payhere_amount,
            payhere_currency,
            status_code,
            md5sig,
            method,
            status_message,
        } = req.body || {};

        /* =====================================================
           REQUIRED PARAMETERS
        ===================================================== */

        if (
            !merchant_id ||
            !order_id ||
            payhere_amount === undefined ||
            !payhere_currency ||
            status_code === undefined ||
            !md5sig
        ) {
            console.error(
                "Missing PayHere notification parameters."
            );

            return res
                .status(400)
                .send(
                    "Missing notification parameters"
                );
        }

        /* =====================================================
           VERIFY MERCHANT ID
        ===================================================== */

        const configuredMerchantId =
            process.env.PAYHERE_MERCHANT_ID;

        if (
            String(merchant_id) !==
            String(configuredMerchantId)
        ) {
            console.error(
                "Invalid PayHere merchant ID."
            );

            return res
                .status(400)
                .send(
                    "Invalid merchant"
                );
        }

        /* =====================================================
           MERCHANT SECRET
        ===================================================== */

        const merchantSecret =
            process.env.PAYHERE_MERCHANT_SECRET;

        if (!merchantSecret) {
            console.error(
                "PAYHERE_MERCHANT_SECRET is missing."
            );

            return res
                .status(500)
                .send(
                    "PayHere configuration error"
                );
        }

        /* =====================================================
           VERIFY PAYHERE MD5 SIGNATURE

           md5sig =
           MD5(
               merchant_id +
               order_id +
               payhere_amount +
               payhere_currency +
               status_code +
               MD5(merchant_secret)
           )
        ===================================================== */

        const hashedSecret =
            md5(
                merchantSecret
            ).toUpperCase();

        const localMd5Sig =
            md5(
                String(
                    merchant_id
                ) +
                    String(
                        order_id
                    ) +
                    String(
                        payhere_amount
                    ) +
                    String(
                        payhere_currency
                    ) +
                    String(
                        status_code
                    ) +
                    hashedSecret
            ).toUpperCase();

        if (
            localMd5Sig !==
            String(md5sig).toUpperCase()
        ) {
            console.error(
                "Invalid PayHere MD5 signature."
            );

            return res
                .status(400)
                .send(
                    "Invalid signature"
                );
        }

        /* =====================================================
           FIND ORDER
        ===================================================== */

        const order =
            await Order.findOne({
                orderID:
                    String(order_id),
            });

        if (!order) {
            console.error(
                "PayHere order not found:",
                order_id
            );

            return res
                .status(404)
                .send(
                    "Order not found"
                );
        }

        /* =====================================================
           VERIFY AMOUNT
        ===================================================== */

        const receivedAmount =
            Number(
                payhere_amount
            ).toFixed(2);

        const expectedAmount =
            Number(
                order.total
            ).toFixed(2);

        if (
            receivedAmount !==
            expectedAmount
        ) {
            console.error(
                "PayHere payment amount mismatch:",
                {
                    orderId:
                        order.orderID,
                    expected:
                        expectedAmount,
                    received:
                        receivedAmount,
                }
            );

            return res
                .status(400)
                .send(
                    "Amount mismatch"
                );
        }

        /* =====================================================
           VERIFY CURRENCY
        ===================================================== */

        if (
            String(
                payhere_currency
            ).toUpperCase() !==
            CURRENCY
        ) {
            console.error(
                "PayHere currency mismatch."
            );

            return res
                .status(400)
                .send(
                    "Currency mismatch"
                );
        }

        /* =====================================================
           PAYMENT SUCCESS

           PayHere:
           2 = Success
        ===================================================== */

        if (
            String(status_code) ===
            "2"
        ) {
            /*
             * Idempotency protection.
             */

            if (
                order.paymentStatus ===
                "Paid"
            ) {
                console.log(
                    `PayHere payment already processed: ${order.orderID}`
                );

                return res
                    .status(200)
                    .send(
                        "Already processed"
                    );
            }

            order.paymentStatus =
                "Paid";

            order.paymentId =
                payment_id
                    ? String(
                          payment_id
                      )
                    : null;

            order.paymentGateway =
                "PayHere";

            order.paymentMethodUsed =
                method
                    ? String(method)
                    : null;

            order.paymentMessage =
                status_message
                    ? String(
                          status_message
                      )
                    : null;

            order.paidAt =
                new Date();

            order.orderStatus =
                "Confirmed";

            await order.save();

            console.log(
                `PayHere payment SUCCESS: ${order.orderID}`
            );

            return res
                .status(200)
                .send("OK");
        }

        /* =====================================================
           PAYMENT PENDING

           PayHere:
           0 = Pending
        ===================================================== */

        if (
            String(status_code) ===
            "0"
        ) {
            order.paymentStatus =
                "Pending";

            order.paymentGateway =
                "PayHere";

            order.paymentMessage =
                status_message
                    ? String(
                          status_message
                      )
                    : null;

            await order.save();

            return res
                .status(200)
                .send("OK");
        }

        /* =====================================================
           PAYMENT CANCELLED / FAILED

           PayHere:
           -1 = Cancelled
           -2 = Failed
        ===================================================== */

        if (
            String(status_code) ===
                "-1" ||
            String(status_code) ===
                "-2"
        ) {
            /*
             * Avoid releasing stock multiple times.
             */

            const wasAlreadyFailed =
                order.paymentStatus ===
                "Failed";

            order.paymentStatus =
                "Failed";

            order.paymentGateway =
                "PayHere";

            order.paymentId =
                payment_id
                    ? String(
                          payment_id
                      )
                    : null;

            order.paymentMethodUsed =
                method
                    ? String(method)
                    : null;

            order.paymentMessage =
                status_message
                    ? String(
                          status_message
                      )
                    : null;

            await order.save();

            if (!wasAlreadyFailed) {
                await releaseOrderStock(
                    order
                );
            }

            return res
                .status(200)
                .send("OK");
        }

        /* =====================================================
           CHARGEBACK

           PayHere:
           -3 = Chargeback
        ===================================================== */

        if (
            String(status_code) ===
            "-3"
        ) {
            order.paymentStatus =
                "Refunded";

            order.paymentGateway =
                "PayHere";

            order.paymentId =
                payment_id
                    ? String(
                          payment_id
                      )
                    : null;

            order.paymentMessage =
                status_message
                    ? String(
                          status_message
                      )
                    : null;

            await order.save();

            return res
                .status(200)
                .send("OK");
        }

        /* =====================================================
           UNKNOWN STATUS

           Still acknowledge PayHere so it doesn't endlessly
           retry the notification.
        ===================================================== */

        console.warn(
            "Unknown PayHere status:",
            status_code
        );

        return res
            .status(200)
            .send("OK");
    } catch (error) {
        console.error(
            "PayHere notification error:",
            error
        );

        return res
            .status(500)
            .send(
                "Server error"
            );
    }
}