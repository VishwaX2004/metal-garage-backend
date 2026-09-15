import Order from "../models/order.js";
import Product from "../models/product.js";

// =============================================================
// HELPERS
// =============================================================

function generateOrderID() {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `MG-${timestamp}-${random}`;
}

function getUserID(req) {
    return (
        req.user?.userID ||
        req.user?.userId ||
        req.user?.id ||
        req.user?._id ||
        null
    );
}

function isAdminUser(req) {
    return (
        req.user?.isAdmin === true ||
        req.user?.isAdmin === "true" ||
        req.user?.role === "admin" ||
        req.user?.role === "Admin"
    );
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

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "Your cart is empty.",
            });
        }

        if (!shippingAddress || typeof shippingAddress !== "object") {
            return res.status(400).json({
                message: "Shipping address is required.",
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
                String(shippingAddress[field]).trim() === ""
            ) {
                return res.status(400).json({
                    message: `${field} is required.`,
                });
            }
        }

        if (paymentMethod !== "Cash on Delivery") {
            return res.status(400).json({
                message: "Invalid payment method.",
            });
        }

        const orderItems = [];
        let subtotal = 0;

        for (const cartItem of items) {
            const productID =
                cartItem.productID || cartItem._id || cartItem.id;

            if (!productID) {
                return res.status(400).json({
                    message: "One of the products has an invalid product ID.",
                });
            }

            const quantity =
                Number(cartItem.cartQuantity) ||
                Number(cartItem.quantity) ||
                1;

            if (!Number.isInteger(quantity) || quantity < 1) {
                return res.status(400).json({
                    message: "Invalid product quantity.",
                });
            }

            let product = await Product.findOne({
                productID: String(productID),
            });

            if (!product) {
                try {
                    product = await Product.findById(productID);
                } catch {
                    product = null;
                }
            }

            if (!product) {
                return res.status(404).json({
                    message: `Product "${productID}" could not be found.`,
                });
            }

            const availableStock = Number(product.quantity) || 0;

            if (availableStock < quantity) {
                return res.status(400).json({
                    message: `${product.name} has only ${availableStock} item(s) available.`,
                });
            }

            const price = Number(product.price) || 0;
            const itemTotal = price * quantity;

            subtotal += itemTotal;

            orderItems.push({
                productID: product.productID,
                name: product.name,
                image:
                    Array.isArray(product.images) && product.images.length > 0
                        ? product.images[0]
                        : "",
                price,
                quantity,
                total: itemTotal,
            });
        }

        let finalDiscount = Number(discount) || 0;

        if (finalDiscount < 0) {
            finalDiscount = 0;
        }

        if (finalDiscount > subtotal) {
            finalDiscount = subtotal;
        }

        const total = Math.max(0, subtotal - finalDiscount);

        const userID = getUserID(req);
        const orderID = generateOrderID();

        for (const item of orderItems) {
            const updatedProduct = await Product.findOneAndUpdate(
                {
                    productID: item.productID,
                    quantity: { $gte: item.quantity },
                },
                {
                    $inc: { quantity: -item.quantity },
                },
                { returnDocument: "after" }
            );

            if (!updatedProduct) {
                return res.status(400).json({
                    message: `${item.name} is no longer available in the requested quantity.`,
                });
            }

            if (Number(updatedProduct.quantity) <= 0) {
                await Product.findOneAndUpdate(
                    { productID: item.productID },
                    {
                        $set: {
                            quantity: 0,
                            inStock: false,
                            status: "Out of Stock",
                        },
                    },
                    { returnDocument: "after" }
                );
            } else {
                await Product.findOneAndUpdate(
                    { productID: item.productID },
                    {
                        $set: {
                            inStock: true,
                            status: "Active",
                        },
                    },
                    { returnDocument: "after" }
                );
            }
        }

        const order = new Order({
            orderID,
            userID,
            customerEmail: String(shippingAddress.email).trim().toLowerCase(),
            items: orderItems,
            shippingAddress: {
                fullName: String(shippingAddress.fullName).trim(),
                phone: String(shippingAddress.phone).trim(),
                email: String(shippingAddress.email).trim().toLowerCase(),
                address: String(shippingAddress.address).trim(),
                city: String(shippingAddress.city).trim(),
                province: String(shippingAddress.province).trim(),
                postalCode: shippingAddress.postalCode
                    ? String(shippingAddress.postalCode).trim()
                    : "",
                notes: shippingAddress.notes
                    ? String(shippingAddress.notes).trim()
                    : "",
            },
            subtotal,
            discount: finalDiscount,
            total,
            promoCode: promoCode ? String(promoCode).trim().toUpperCase() : "",
            paymentMethod,
            paymentStatus: "Pending",
            orderStatus: "Pending",
        });

        await order.save();

        return res.status(201).json({
            success: true,
            message: "Your order has been placed successfully.",
            order: {
                _id: order._id,
                orderID: order.orderID,
                items: order.items,
                shippingAddress: order.shippingAddress,
                subtotal: order.subtotal,
                discount: order.discount,
                total: order.total,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus,
                orderStatus: order.orderStatus,
                createdAt: order.createdAt,
            },
        });
    } catch (error) {
        console.error("Create order error:", error);

        return res.status(500).json({
            message: "Something went wrong while placing your order.",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
}

// =============================================================
// GET MY ORDERS
// GET /api/orders/my-orders
// =============================================================

export async function getMyOrders(req, res) {
    try {
        const userID = getUserID(req);

        if (!userID) {
            return res.status(401).json({
                message: "User authentication is required.",
            });
        }

        const orders = await Order.find({
            userID: String(userID),
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            orders,
        });
    } catch (error) {
        console.error("Get my orders error:", error);

        return res.status(500).json({
            message: "Unable to retrieve your orders.",
        });
    }
}

// =============================================================
// GET SINGLE ORDER (owner or admin only)
// GET /api/orders/:orderID
// =============================================================

export async function getOrderByID(req, res) {
    try {
        const { orderID } = req.params;

        if (!orderID) {
            return res.status(400).json({
                message: "Order ID is required.",
            });
        }

        const order = await Order.findOne({ orderID });

        if (!order) {
            return res.status(404).json({
                message: "Order not found.",
            });
        }

        // -----------------------------------------------------
        // Ownership check — a regular user can only view
        // their own order. Admins can view any order.
        // -----------------------------------------------------

        const userID = getUserID(req);
        const admin = isAdminUser(req);

        if (!admin && String(order.userID) !== String(userID)) {
            return res.status(403).json({
                message: "You do not have permission to view this order.",
            });
        }

        return res.status(200).json({
            success: true,
            order,
        });
    } catch (error) {
        console.error("Get order error:", error);

        return res.status(500).json({
            message: "Unable to retrieve the order.",
        });
    }
}

// =============================================================
// DELETE ORDER (owner or admin)
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

        const userID = getUserID(req);
        const admin = isAdminUser(req);

        if (!admin && !userID) {
            return res.status(401).json({
                message: "User authentication is required.",
            });
        }

        // -----------------------------------------------------
        // Admins can delete any order. Regular users can only
        // delete an order that belongs to them.
        // -----------------------------------------------------

        const query = admin
            ? { orderID: String(orderID) }
            : { orderID: String(orderID), userID: String(userID) };

        const order = await Order.findOne(query);

        if (!order) {
            return res.status(404).json({
                message:
                    "Order not found or you do not have permission to delete it.",
            });
        }

        await Order.deleteOne({ _id: order._id });

        return res.status(200).json({
            success: true,
            message: "Order deleted successfully.",
        });
    } catch (error) {
        console.error("Delete order error:", error);

        return res.status(500).json({
            message: "Unable to delete the order.",
        });
    }
}

// =============================================================
// ADMIN: GET ALL ORDERS
// GET /api/orders/admin/all
// =============================================================

export async function getAllOrdersAdmin(req, res) {
    try {
        const orders = await Order.find({}).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            orders,
        });
    } catch (error) {
        console.error("Get all orders (admin) error:", error);

        return res.status(500).json({
            message: "Unable to retrieve orders.",
        });
    }
}

// =============================================================
// ADMIN: UPDATE ORDER STATUS
// PUT /api/orders/admin/:orderID/status
// =============================================================

const VALID_ORDER_STATUSES = [
    "Pending",
    "Confirmed",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
];

const VALID_PAYMENT_STATUSES = [
    "Pending",
    "Paid",
    "Failed",
    "Refunded",
];

export async function updateOrderStatusAdmin(req, res) {
    try {
        const { orderID } = req.params;
        const { orderStatus, paymentStatus } = req.body;

        if (!orderID) {
            return res.status(400).json({
                message: "Order ID is required.",
            });
        }

        if (
            orderStatus === undefined &&
            paymentStatus === undefined
        ) {
            return res.status(400).json({
                message:
                    "At least one of orderStatus or paymentStatus is required.",
            });
        }

        const update = {};

        if (orderStatus !== undefined) {
            if (!VALID_ORDER_STATUSES.includes(orderStatus)) {
                return res.status(400).json({
                    message: "Invalid order status.",
                });
            }
            update.orderStatus = orderStatus;
        }

        if (paymentStatus !== undefined) {
            if (!VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
                return res.status(400).json({
                    message: "Invalid payment status.",
                });
            }
            update.paymentStatus = paymentStatus;
        }

        const order = await Order.findOneAndUpdate(
            { orderID: String(orderID) },
            { $set: update },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                message: "Order not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Order updated successfully.",
            order,
        });
    } catch (error) {
        console.error("Update order status (admin) error:", error);

        return res.status(500).json({
            message: "Unable to update the order.",
        });
    }
}