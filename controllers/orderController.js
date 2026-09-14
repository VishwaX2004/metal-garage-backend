import Order from "../models/order.js";
import Product from "../models/product.js";

// =============================================================
// GENERATE ORDER ID
// =============================================================

function generateOrderID() {
    const timestamp = Date.now()
        .toString()
        .slice(-8);

    const random = Math.floor(
        1000 + Math.random() * 9000
    );

    return `MG-${timestamp}-${random}`;
}

// =============================================================
// CREATE ORDER
// POST /api/orders
// =============================================================

export async function createOrder(req, res) {
    try {
        const {
            items,
            shippingAddress,
            promoCode = "",
            discount = 0,
            paymentMethod = "Cash on Delivery",
        } = req.body;

        // =====================================================
        // VALIDATE ITEMS
        // =====================================================

        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {
            return res.status(400).json({
                message: "Your cart is empty.",
            });
        }

        // =====================================================
        // VALIDATE SHIPPING ADDRESS
        // =====================================================

        if (
            !shippingAddress ||
            typeof shippingAddress !== "object"
        ) {
            return res.status(400).json({
                message:
                    "Shipping address is required.",
            });
        }

        const requiredFields = [
            "fullName",
            "phone",
            "email",
            "address",
            "city",
            "province",
        ];

        for (const field of requiredFields) {
            if (
                !shippingAddress[field] ||
                String(
                    shippingAddress[field]
                ).trim() === ""
            ) {
                return res.status(400).json({
                    message:
                        `${field} is required.`,
                });
            }
        }

        // =====================================================
        // VALIDATE PAYMENT METHOD
        // =====================================================

        if (
            paymentMethod !==
            "Cash on Delivery"
        ) {
            return res.status(400).json({
                message:
                    "Invalid payment method.",
            });
        }

        // =====================================================
        // BUILD ORDER ITEMS
        // =====================================================

        const orderItems = [];

        let subtotal = 0;

        for (const cartItem of items) {
            // -------------------------------------------------
            // GET PRODUCT ID
            // -------------------------------------------------

            const productID =
                cartItem.productID ||
                cartItem._id ||
                cartItem.id;

            if (!productID) {
                return res.status(400).json({
                    message:
                        "One of the products has an invalid product ID.",
                });
            }

            // -------------------------------------------------
            // GET QUANTITY
            // -------------------------------------------------

            const quantity =
                Number(
                    cartItem.cartQuantity
                ) ||
                Number(
                    cartItem.quantity
                ) ||
                1;

            if (
                !Number.isInteger(quantity) ||
                quantity < 1
            ) {
                return res.status(400).json({
                    message:
                        "Invalid product quantity.",
                });
            }

            // -------------------------------------------------
            // FIND PRODUCT BY productID
            // -------------------------------------------------

            let product =
                await Product.findOne({
                    productID:
                        String(productID),
                });

            // -------------------------------------------------
            // FALLBACK TO MONGODB _id
            // -------------------------------------------------

            if (!product) {
                try {
                    product =
                        await Product.findById(
                            productID
                        );
                } catch {
                    product = null;
                }
            }

            // -------------------------------------------------
            // PRODUCT NOT FOUND
            // -------------------------------------------------

            if (!product) {
                return res.status(404).json({
                    message:
                        `Product "${productID}" could not be found.`,
                });
            }

            // -------------------------------------------------
            // CHECK STOCK
            // -------------------------------------------------

            const availableStock =
                Number(product.quantity) || 0;

            if (
                availableStock < quantity
            ) {
                return res.status(400).json({
                    message:
                        `${product.name} has only ${availableStock} item(s) available.`,
                });
            }

            // -------------------------------------------------
            // CURRENT DATABASE PRICE
            // -------------------------------------------------

            const price =
                Number(product.price) || 0;

            const itemTotal =
                price * quantity;

            subtotal += itemTotal;

            // -------------------------------------------------
            // PRODUCT SNAPSHOT
            // -------------------------------------------------

            orderItems.push({
                productID:
                    product.productID,

                name:
                    product.name,

                image:
                    Array.isArray(
                        product.images
                    ) &&
                    product.images.length > 0
                        ? product.images[0]
                        : "",

                price,

                quantity,

                total:
                    itemTotal,
            });
        }

        // =====================================================
        // DISCOUNT
        // =====================================================

        let finalDiscount =
            Number(discount) || 0;

        if (finalDiscount < 0) {
            finalDiscount = 0;
        }

        if (
            finalDiscount > subtotal
        ) {
            finalDiscount = subtotal;
        }

        // =====================================================
        // TOTAL
        // =====================================================

        const total = Math.max(
            0,
            subtotal - finalDiscount
        );

        // =====================================================
        // USER ID
        // =====================================================

        const userID =
            req.user?.userID ||
            req.user?.userId ||
            req.user?.id ||
            req.user?._id ||
            null;

        // =====================================================
        // ORDER ID
        // =====================================================

        const orderID =
            generateOrderID();

        // =====================================================
        // REDUCE STOCK
        // =====================================================

        for (const item of orderItems) {
            const updatedProduct =
                await Product.findOneAndUpdate(
                    {
                        productID:
                            item.productID,

                        quantity: {
                            $gte:
                                item.quantity,
                        },
                    },
                    {
                        $inc: {
                            quantity:
                                -item.quantity,
                        },
                    },
                    {
                        returnDocument:
                            "after",
                    }
                );

            if (!updatedProduct) {
                return res.status(400).json({
                    message:
                        `${item.name} is no longer available in the requested quantity.`,
                });
            }

            // -------------------------------------------------
            // UPDATE STOCK STATUS
            // -------------------------------------------------

            if (
                Number(
                    updatedProduct.quantity
                ) <= 0
            ) {
                await Product.findOneAndUpdate(
                    {
                        productID:
                            item.productID,
                    },
                    {
                        $set: {
                            quantity: 0,
                            inStock: false,
                            status:
                                "Out of Stock",
                        },
                    },
                    {
                        returnDocument:
                            "after",
                    }
                );
            } else {
                await Product.findOneAndUpdate(
                    {
                        productID:
                            item.productID,
                    },
                    {
                        $set: {
                            inStock: true,
                            status:
                                "Active",
                        },
                    },
                    {
                        returnDocument:
                            "after",
                    }
                );
            }
        }

        // =====================================================
        // CREATE ORDER
        // =====================================================

        const order =
            new Order({
                orderID,

                userID,

                customerEmail:
                    String(
                        shippingAddress.email
                    )
                        .trim()
                        .toLowerCase(),

                items:
                    orderItems,

                shippingAddress: {
                    fullName:
                        String(
                            shippingAddress.fullName
                        ).trim(),

                    phone:
                        String(
                            shippingAddress.phone
                        ).trim(),

                    email:
                        String(
                            shippingAddress.email
                        )
                            .trim()
                            .toLowerCase(),

                    address:
                        String(
                            shippingAddress.address
                        ).trim(),

                    city:
                        String(
                            shippingAddress.city
                        ).trim(),

                    province:
                        String(
                            shippingAddress.province
                        ).trim(),

                    postalCode:
                        shippingAddress.postalCode
                            ? String(
                                  shippingAddress.postalCode
                              ).trim()
                            : "",

                    notes:
                        shippingAddress.notes
                            ? String(
                                  shippingAddress.notes
                              ).trim()
                            : "",
                },

                subtotal,

                discount:
                    finalDiscount,

                total,

                promoCode:
                    promoCode
                        ? String(
                              promoCode
                          )
                              .trim()
                              .toUpperCase()
                        : "",

                paymentMethod,

                paymentStatus:
                    "Pending",

                orderStatus:
                    "Pending",
            });

        await order.save();

        // =====================================================
        // RESPONSE
        // =====================================================

        return res.status(201).json({
            success: true,

            message:
                "Your order has been placed successfully.",

            order: {
                _id:
                    order._id,

                orderID:
                    order.orderID,

                items:
                    order.items,

                shippingAddress:
                    order.shippingAddress,

                subtotal:
                    order.subtotal,

                discount:
                    order.discount,

                total:
                    order.total,

                paymentMethod:
                    order.paymentMethod,

                paymentStatus:
                    order.paymentStatus,

                orderStatus:
                    order.orderStatus,

                createdAt:
                    order.createdAt,
            },
        });
    } catch (error) {
        console.error(
            "Create order error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while placing your order.",

            error:
                process.env.NODE_ENV ===
                "development"
                    ? error.message
                    : undefined,
        });
    }
}

// =============================================================
// GET MY ORDERS
// GET /api/orders/my-orders
// =============================================================

export async function getMyOrders(
    req,
    res
) {
    try {
        const userID =
            req.user?.userID ||
            req.user?.userId ||
            req.user?.id ||
            req.user?._id;

        if (!userID) {
            return res.status(401).json({
                message:
                    "User authentication is required.",
            });
        }

        const orders =
            await Order.find({
                userID:
                    String(userID),
            }).sort({
                createdAt: -1,
            });

        return res.status(200).json({
            success: true,
            orders,
        });
    } catch (error) {
        console.error(
            "Get my orders error:",
            error
        );

        return res.status(500).json({
            message:
                "Unable to retrieve your orders.",
        });
    }
}

// =============================================================
// GET SINGLE ORDER
// GET /api/orders/:orderID
// =============================================================

export async function getOrderByID(
    req,
    res
) {
    try {
        const { orderID } =
            req.params;

        if (!orderID) {
            return res.status(400).json({
                message:
                    "Order ID is required.",
            });
        }

        const order =
            await Order.findOne({
                orderID,
            });

        if (!order) {
            return res.status(404).json({
                message:
                    "Order not found.",
            });
        }

        return res.status(200).json({
            success: true,
            order,
        });
    } catch (error) {
        console.error(
            "Get order error:",
            error
        );

        return res.status(500).json({
            message:
                "Unable to retrieve the order.",
        });
    }
}


// =============================================================
// DELETE MY ORDER
// DELETE /api/orders/:orderID
// =============================================================

export async function deleteOrder(req, res) {
    try {
        const { orderID } = req.params;

        if (!orderID) {
            return res.status(400).json({
                message: "Order ID is required.",
            });
        }

        // ---------------------------------------------------------
        // Get logged-in user ID
        // ---------------------------------------------------------

        const userID =
            req.user?.userID ||
            req.user?.userId ||
            req.user?.id ||
            req.user?._id ||
            null;

        if (!userID) {
            return res.status(401).json({
                message: "User authentication is required.",
            });
        }

        // ---------------------------------------------------------
        // Find the order belonging to this logged-in user
        // ---------------------------------------------------------

        const order = await Order.findOne({
            orderID: String(orderID),
            userID: String(userID),
        });

        if (!order) {
            return res.status(404).json({
                message:
                    "Order not found or you do not have permission to delete it.",
            });
        }

        // ---------------------------------------------------------
        // Delete order
        // ---------------------------------------------------------

        await Order.deleteOne({
            _id: order._id,
        });

        return res.status(200).json({
            success: true,
            message: "Order deleted successfully.",
        });
    } catch (error) {
        console.error(
            "Delete order error:",
            error
        );

        return res.status(500).json({
            message:
                "Unable to delete the order.",
        });
    }
}

