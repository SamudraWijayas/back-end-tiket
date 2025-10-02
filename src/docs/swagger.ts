import swaggerAutogen from "swagger-autogen";

const doc = {
  info: {
    version: "v0.0.1",
    title: "Dokumentasi API ACARA",
    description: "Dokumentasi API ACARA",
  },
  servers: [
    {
      url: "http://localhost:3400/api",
      description: "Local Server",
    },
    {
      url: "https://back-end-acara.vercel.app/api",
      description: "Deploy Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
      },
    },
    schemas: {
      LoginRequest: {
        identifier: "agung2025",
        password: "Agung2025!",
      },
      RegisterRequest: {
        fullName: "member2025",
        username: "member2025",
        email: "member2025@yopmail.com",
        password: "Member2025!",
        confirmPassword: "Member2025!",
      },
      UserResponse: {
        type: "object",
        properties: {
          id: { type: "string", example: "64ac0f62b12f2a2c9f9e5c99" },
          name: { type: "string", example: "John Doe" },
          email: { type: "string", example: "johndoe@mail.com" },
          role: { type: "string", example: "USER" },
          createdAt: { type: "string", example: "2025-08-16T10:00:00Z" },
          updatedAt: { type: "string", example: "2025-08-16T10:10:00Z" },
        },
      },
      ActivationRequest: {
        code: "abcdef",
      },
      UpdateProfileRequest: {
        fullName: "",
        profilePicture: "",
      },
      UpdatePasswordRequest: {
        oldPassword: "",
        password: "",
        confirmPassword: "",
      },
      CreateCategoryRequest: {
        name: "",
        description: "",
        icon: "",
      },
      CreateEventRequest: {
        name: "",
        banner: "fileUrl",
        category: "category ObjectID",
        description: "",
        startDate: "yyyy-mm-dd hh:mm:ss",
        endDate: "yyyy-mm-dd hh:mm:ss",
        location: {
          region: 3273,
          coordinates: [0, 0],
          address: "",
        },
        isOnline: false,
        isFeatured: false,
        isPublish: false,
      },
      RemoveMediaRequest: {
        fileUrl: "",
      },
      CreateBannerRequest: {
        title: "Banner 3 - Title",
        image:
          "https://res.cloudinary.com/five-code/image/upload/v1734918925/f70vpihmblj8lvdmdcrs.png",
        isShow: false,
      },
      UpdateUsersRequest: {
        fullName: "ongkeh",
        username: "ongger",
        isActive: "true",
      },
      CreateTicketRequest: {
        price: 1500,
        name: "Ticket Reguler",
        events: "6762aa5dacb76a9b3e2cb1da",
        description: "Ticket Reguler - Description",
        quantity: 100,
      },
      CreateOrderRequest: {
        events: "event object id",
        ticket: "ticket object id",
        quantity: 1,
      },
    },
  },
};

const outputFile = "./swagger_output.json";
const endpointsFiles = ["../routes/api.ts"];

swaggerAutogen({ openapi: "3.0.0" })(outputFile, endpointsFiles, doc);
