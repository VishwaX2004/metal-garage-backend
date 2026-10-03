import crypto from "crypto";
import jwt from "jsonwebtoken";

import Order from "../models/order.js";
import Product from "../models/product.js";


/* =============================================================
   PAYHERE CONFIG
============================================================= */

const PAYHERE_ACTION_URL =
    "https://sandbox.payhere.lk/pay/checkout";

const CURRENCY =
    "LKR";


/* =============================================================
   HELPERS
============================================================= */

function md5(value) {
    return crypto
        .createHash("md5")
        .update(String(value))
        .digest("hex");
}


function generatePayHereHash({
    merchantId,
    orderId,
    amount,
    currency,
    merchantSecret,
}) {
    const formattedAmount =
        Number(amount).toFixed(2);

    const hashedSecret =
        md5(
            merchantSecret
        ).toUpperCase();

    return md5(
        merchantId +
        orderId +
        formattedAmount +
        currency +
        hashedSecret
    ).toUpperCase();
}


function getTokenFromRequest(req) {
    const header =
        req.headers.authorization;

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
                message:
                    "Authentication token is required.",
            });
        }


        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );


        req.user =
            decoded;


        next();

    } catch (error) {
        console.error(
            "PayHere auth error:",
            error
        );

        return res.status(401).json({
            message:
                "Invalid or expired authentication token.",
        });
    }
}


/* =============================================================
   CREATE PAYHERE PAYMENT
   POST /api/payments/payhere/create
============================================================= */

export async function createPayHerePayment(
    req,
    res
) {
    try {
        const {
            orderId,
        } = req.body;


        if (!orderId) {
            return res.status(400).json({
                message:
                    "Order ID is required.",
            });
        }


        const userID =
            getUserIDFromToken(req);


        if (!userID) {
            return res.status(401).json({
                message:
                    "User authentication is required.",
            });
        }


        /* =====================================================
           FIND ORDER
        ===================================================== */

        const order =
            await Order.findOne({
                orderID:
                    String(orderId),

                userID:
                    String(userID),
            });


        if (!order) {
            return res.status(404).json({
                message:
                    "Order not found or you do not have permission to pay for this order.",
            });
        }


        /* =====================================================
           VALIDATE PAYMENT
        ===================================================== */

        if (
            order.paymentMethod !==
            "PayHere"
        ) {
            return res.status(400).json({
                message:
                    "This order is not configured for PayHere.",
            });
        }


        if (
            order.paymentStatus ===
            "Paid"
        ) {
            return res.status(400).json({
                message:
                    "This order has already been paid.",
            });
        }


        if (
            order.paymentStatus !==
            "Pending"
        ) {
            return res.status(400).json({
                message:
                    "This order is not available for payment.",
            });
        }


        /* =====================================================
           ENV VALIDATION
        ===================================================== */

        const merchantId =
            process.env
                .PAYHERE_MERCHANT_ID;

        const merchantSecret =
            process.env
                .PAYHERE_MERCHANT_SECRET;

        const notifyUrl =
            process.env
                .PAYHERE_NOTIFY_URL;

        const frontendUrl =
            process.env
                .FRONTEND_URL ||
            "https://metal-garage.vercel.app";


        if (
            !merchantId ||
            !merchantSecret ||
            !notifyUrl
        ) {
            console.error(
                "PayHere environment variables are missing."
            );

            return res.status(500).json({
                message:
                    "PayHere is not configured correctly on the server.",
            });
        }


        /* =====================================================
           CUSTOMER NAME
        ===================================================== */

        const fullName =
            String(
                order.shippingAddress
                    ?.fullName || ""
            ).trim();


        const nameParts =
            fullName.split(
                /\s+/
            );


        const firstName =
            nameParts.shift() ||
            "Customer";


        const lastName =
            nameParts.join(" ") ||
            "Customer";


        /* =====================================================
           AMOUNT
        ===================================================== */

        const amount =
            Number(
                order.total
            ).toFixed(2);


        /* =====================================================
           HASH
        ===================================================== */

        const hash =
            generatePayHereHash({
                merchantId,
                orderId:
                    order.orderID,
                amount,
                currency:
                    CURRENCY,
                merchantSecret,
            });


        /* =====================================================
           RETURN / CANCEL URL
        ===================================================== */

        const returnUrl =
            `${
                frontendUrl.replace(
                    /\/$/,
                    ""
                )
            }/payment/success?order_id=${encodeURIComponent(
                order.orderID
            )}`;


        const cancelUrl =
            `${
                frontendUrl.replace(
                    /\/$/,
                    ""
                )
            }/payment/cancel?order_id=${encodeURIComponent(
                order.orderID
            )}`;


        /* =====================================================
           ITEM DESCRIPTION
        ===================================================== */

        const items =
            order.items
                .map(
                    (item) =>
                        `${item.name} x${item.quantity}`
                )
                .join(", ");


        /* =====================================================
           PAYHERE FORM DATA
        ===================================================== */

        const payment = {
            action:
                PAYHERE_ACTION_URL,

            merchant_id:
                merchantId,

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

            email:
                order.shippingAddress
                    .email,

            phone:
                order.shippingAddress
                    .phone,

            address:
                order.shippingAddress
                    .address,

            city:
                order.shippingAddress
                    .city,

            country:
                "Sri Lanka",

            order_id:
                order.orderID,

            items:
                items ||
                `Metal Garage Order ${order.orderID}`,

            currency:
                CURRENCY,

            amount,

            hash,

            delivery_address:
                order.shippingAddress
                    .address,

            delivery_city:
                order.shippingAddress
                    .city,

            delivery_country:
                "Sri Lanka",
        };


        console.log(
            "PayHere payment created:",
            {
                orderId:
                    order.orderID,

                amount,

                currency:
                    CURRENCY,
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
            message:
                "Unable to start PayHere payment.",
        });
    }
}


/* =============================================================
   RELEASE STOCK
============================================================= */

async function releaseOrderStock(
    order
) {
    if (
        order.stockReleased
    ) {
        return;
    }


    for (
        const item of order.items
    ) {
        const product =
            await Product.findOneAndUpdate(
                {
                    productID:
                        item.productID,
                },

                {
                    $inc: {
                        quantity:
                            item.quantity,
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


    order.stockReleased =
        true;

    await order.save();
}


/* =============================================================
   PAYHERE NOTIFICATION
   POST /api/payments/payhere/notify
============================================================= */

export async function payHereNotify(
    req,
    res
) {
    try {
        console.log(
            "=============================="
        );

        console.log(
            "PAYHERE NOTIFICATION"
        );

        console.log(
            req.body
        );

        console.log(
            "=============================="
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
        } = req.body;


        /* =====================================================
           REQUIRED VALUES
        ===================================================== */

        if (
            !merchant_id ||
            !order_id ||
            !payhere_amount ||
            !payhere_currency ||
            !status_code ||
            !md5sig
        ) {
            return res.status(400).send(
                "Missing notification parameters"
            );
        }


        /* =====================================================
           VERIFY MERCHANT
        ===================================================== */

        if (
            String(merchant_id) !==
            String(
                process.env
                    .PAYHERE_MERCHANT_ID
            )
        ) {
            console.error(
                "Invalid merchant ID."
            );

            return res.status(400).send(
                "Invalid merchant"
            );
        }


        /* =====================================================
           GENERATE LOCAL SIGNATURE
        ===================================================== */

        const merchantSecret =
            process.env
                .PAYHERE_MERCHANT_SECRET;


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


        /* =====================================================
           SIGNATURE CHECK
        ===================================================== */

        if (
            localMd5Sig !==
            String(
                md5sig
            ).toUpperCase()
        ) {
            console.error(
                "Invalid PayHere MD5 signature."
            );

            return res.status(400).send(
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
                "Order not found:",
                order_id
            );

            return res.status(404).send(
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
                "Payment amount mismatch.",
                {
                    expected:
                        expectedAmount,

                    received:
                        receivedAmount,
                }
            );

            return res.status(400).send(
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
            "LKR"
        ) {
            return res.status(400).send(
                "Currency mismatch"
            );
        }


        /* =====================================================
           SUCCESS
           STATUS = 2
        ===================================================== */

        if (
            String(status_code) ===
            "2"
        ) {
            /*
             * Idempotency:
             * If PayHere sends the same successful
             * notification more than once, do not
             * modify the order again.
             */

            if (
                order.paymentStatus ===
                "Paid"
            ) {
                return res.status(200).send(
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

            /*
             * Order can now move into
             * confirmed state.
             */

            order.orderStatus =
                "Confirmed";


            await order.save();


            console.log(
                `PayHere payment SUCCESS for ${order.orderID}`
            );


            return res.status(200).send(
                "OK"
            );
        }


        /* =====================================================
           PENDING
           STATUS = 0
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


            return res.status(200).send(
                "OK"
            );
        }


        /* =====================================================
           CANCELLED / FAILED
        ===================================================== */

        if (
            String(status_code) ===
                "-1" ||
            String(status_code) ===
                "-2"
        ) {
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


            /*
             * Restore stock because this payment
             * did not complete.
             */

            await releaseOrderStock(
                order
            );


            return res.status(200).send(
                "OK"
            );
        }


        /* =====================================================
           CHARGEBACK
           STATUS = -3
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


            return res.status(200).send(
                "OK"
            );
        }


        return res.status(200).send(
            "OK"
        );

    } catch (error) {
        console.error(
            "PayHere notify error:",
            error
        );

        return res.status(500).send(
            "Server error"
        );
    }
}