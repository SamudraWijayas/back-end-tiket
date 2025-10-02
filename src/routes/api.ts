import express from "express";
import authController from "../controllers/auth.controller";
import authMiddleware from "../middlewares/auth.middleware";
import aclMiddleware from "../middlewares/acl.middleware";
import { ROLES } from "../utils/constant";

import categoryController from "../controllers/category.controller";
import regionController from "../controllers/region.controller";
import eventController from "../controllers/event.controller";
import ticketController from "../controllers/ticket.controller";
import voucherController from "../controllers/voucher.controller";
import lineupController from "../controllers/lineup.controller";
import bannerController from "../controllers/banner.controller";
import orderController from "../controllers/order.controller";
import barcodeController from "../controllers/barcode.controller";
import resetPassword from "../controllers/resetpassword";

const router = express.Router();

router.post(
  "/auth/google",
  authController.loginWithGoogle
  /*
  #swagger.tags = ['Auth']
  #swagger.requestBody = {
    required: true,
    schema: {
      $ref: "#/components/schemas/LoginRequest"
    }
  }
  */
);

router.post(
  "/auth/register",
  authController.register
  /*
  #swagger.tags = ['Auth']
  #swagger.requestBody = {
    required: true,
    schema: {
      $ref: "#/components/schemas/RegisterRequest"
    }
  }
  */
);

router.post(
  "/auth/login",
  authController.login
  /*
  #swagger.tags = ['Auth']
  #swagger.requestBody = {
    required: true,
    schema: {
      $ref: "#/components/schemas/LoginRequest"
    }
  }
  */
);

router.get(
  "/auth/me",
  authMiddleware,
  authController.me
  /*
  #swagger.tags = ['Auth']
  #swagger.security = [{
    "bearerAuth": {}
  }]
  */
);
router.post(
  "/auth/activation",
  authController.activation
  /*
  #swagger.tags = ['Auth']
  #swagger.requestBody = {
    required: true,
    schema: {
      $ref: "#/components/schemas/ActivationRequest"
    }
  }
  */
);

router.put(
  "/auth/update-profile",
  [authMiddleware, aclMiddleware([ROLES.MEMBER])],
  authController.updateProfile
  /*
  #swagger.tags = ['Auth']
  #swagger.security = [{
    "bearerAuth": {}
  }]
  #swagger.requestBody = {
    required: true,
    schema: {
      $ref: "#/components/schemas/UpdateProfileRequest"
    }
  }
  */
);
router.put(
  "/auth/update-password",
  [authMiddleware, aclMiddleware([ROLES.MEMBER])],
  authController.updatePassword
  /*
  #swagger.tags = ['Auth']
  #swagger.security = [{
    "bearerAuth": {}
  }]
  #swagger.requestBody = {
    required: true,
    schema: {
      $ref: "#/components/schemas/UpdatePasswordRequest"
    }
  }
  */
);
router.post("/auth/request-reset-password", resetPassword.requestResetPassword);
router.post("/auth/reset-password", resetPassword.resetPassword);

router.post(
  "/orders",
  [authMiddleware, aclMiddleware([ROLES.MEMBER])],
  orderController.create
  /*
  #swagger.tags = ['Order']
  #swagger.security = [{
    "bearerAuth": ""
  }]
  #swagger.requestBody = {
    required: true,
    schema: {
      $ref: "#/components/schemas/CreateOrderRequest"
    }
  }
  */
);

router.post("/orders/:orderId/cancel", orderController.cancelled);

router.get(
  "/orders/:orderId",
  [authMiddleware, aclMiddleware([ROLES.ADMIN, ROLES.MEMBER, ROLES.ORGANIZER])],
  orderController.findOne
  /*
  #swagger.tags = ['Order']
  #swagger.security = [{
    "bearerAuth": ""
  }]
  */
);

router.put(
  "/orders/:orderId/completed",
  [authMiddleware, aclMiddleware([ROLES.MEMBER])],
  orderController.complete
  /*
  #swagger.tags = ['Order']
  #swagger.security = [{
    "bearerAuth": ""
  }]
  */
);
router.post("/orders/notification", orderController.notification);

router.get(
  "/orders-history",
  [authMiddleware, aclMiddleware([ROLES.MEMBER])],
  orderController.findAllByMember
  /*
  #swagger.tags = ['Order']
  #swagger.security = [{
    "bearerAuth": ""
  }]
  */
);

router.get(
  "/banners",
  bannerController.findAll
  /*
  #swagger.tags = ['Banners']
  */
);
router.get(
  "/banners/:id",
  bannerController.findOne
  /*
  #swagger.tags = ['Banners']
  */
);

router.get(
  "/lineups",
  lineupController.findAll
  /*
  #swagger.tags = ['Lineups']
  */
);
router.get(
  "/lineups/:id",
  lineupController.findOne
  /*
  #swagger.tags = ['Lineups']
  */
);

router.get(
  "/lineups/:eventId/events",
  lineupController.findAllByLineup
  /*
  #swagger.tags = ['Lineups']
  */
);

router.get(
  "/vouchers",
  voucherController.findAll
  /*
  #swagger.tags = ['Vouchers']
  */
);
router.post(
  "/vouchers/validate",
  [authMiddleware, aclMiddleware([ROLES.MEMBER])],
  voucherController.validateVoucher
  /*
  #swagger.tags = ['Vouchers']
  #swagger.security = [{
    "bearerAuth": {}
  }]

  */
);
router.get(
  "/vouchers/:id",
  voucherController.findOne
  /*
  #swagger.tags = ['Vouchers']
  */
);

router.get(
  "/vouchers/:eventId/events",
  voucherController.findAllByEvent
  /*
  #swagger.tags = ['Lineups']
  */
);

// ticket

router.get(
  "/tickets",
  ticketController.findAll
  /*
  #swagger.tags = ['Tickets']
  */
);
router.get(
  "/tickets/:id",
  ticketController.findOne
  /*
  #swagger.tags = ['Tickets']
  */
);
router.get(
  "/tickets/:eventId/events",
  ticketController.findAllByEvent
  /*
  #swagger.tags = ['Tickets']
  */
);

router.get(
  "/category",
  categoryController.findAll
  /*
  #swagger.tags = ['Category']
  */
);
router.get(
  "/category/:id",
  categoryController.findOne
  /*
  #swagger.tags = ['Category']
  */
);

router.get(
  "/events",
  eventController.findAll
  /*
  #swagger.tags = ['Events']
  #swagger.parameters['limit'] = {
    in: 'query',
    type: 'number',
    default: 10
  }
  #swagger.parameters['page'] = {
    in: 'query',
    type: 'number',
    default: 1
  }
  #swagger.parameters['category'] = {
    in: 'query',
    type: 'string'
  }
  #swagger.parameters['isOnline'] = {
    in: 'query',
    type: 'boolean'
  }
  #swagger.parameters['isPublish'] = {
    in: 'query',
    type: 'boolean'
  }
  #swagger.parameters['isFeatured'] = {
    in: 'query',
    type: 'boolean'
  }
  */
);
router.get(
  "/events/:id",
  eventController.findOne
  /*
  #swagger.tags = ['Events']
  */
);
router.get(
  "/events-all",
  eventController.findAllNoLimit
  /*
  #swagger.tags = ['Events']
  */
);

router.get(
  "/events/:slug/slug",
  eventController.findOneBySlug
  /*
  #swagger.tags = ['Events']
  */
);

router.get(
  "/regions",
  regionController.getAllProvinces
  /*
  #swagger.tags = ['Regions']
  */
);
router.get(
  "/regions/:id/province",
  regionController.getProvince
  /*
  #swagger.tags = ['Regions']
  */
);
router.get(
  "/regions/:id/regency",
  regionController.getRegency
  /*
  #swagger.tags = ['Regions']
  */
);
router.get(
  "/regions/:id/district",
  regionController.getDistrict
  /*
  #swagger.tags = ['Regions']
  */
);
router.get(
  "/regions/:id/village",
  regionController.getVillage
  /*
  #swagger.tags = ['Regions']
  */
);
router.get(
  "/regions-search",
  regionController.findByCity
  /*
  #swagger.tags = ['Regions']
  */
);

router.get(
  "/barcode/:orderId",
  [authMiddleware, aclMiddleware([ROLES.MEMBER])],
  barcodeController.getByOrderId
  /*
  #swagger.tags = ['Barcode']
  #swagger.security = [{
    "bearerAuth": ""
  }]
  */
);

export default router;
