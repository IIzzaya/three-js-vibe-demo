export const config = {
    port: parseInt(process.env.PORT || "3000", 10),
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: "*",
    },
    updateInterval: 20,
};
