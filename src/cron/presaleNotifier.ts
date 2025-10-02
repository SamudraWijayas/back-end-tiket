import cron from "node-cron";
import PresaleModel from "../models/PresaleQueue.model";

export const presaleNotifierCron = () => {
  // cron setiap menit untuk testing
  cron.schedule("* * * * *", async () => {
    console.log("🔔 [TEST] Cron job running: check presale queues");

    const pendingQueues = await PresaleModel.find({
      status: "waiting",
    }).populate("event");

    const now = Date.now();

    for (const queue of pendingQueues) {
      const event = queue.event as any;

      // Untuk testing: trigger jika event startDate <= 2 menit dari sekarang
      const diff = new Date(event.startDate).getTime() - now;
      if (diff <= 2 * 60 * 1000) {
        // 2 menit
        queue.status = "notified";
        await queue.save(); // trigger post("save") hook
        console.log(
          `📧 [TEST] Notified user ${queue.user} for event ${event.name}`
        );
      }
    }
  });
};

// import cron from "node-cron";
// import PresaleModel from "../models/PresaleQueue.model";

// export const presaleNotifierCron = () => {
//   cron.schedule("0 9 * * *", async () => {
//     // setiap jam 9 pagi
//     console.log("🔔 Cron job running: check presale queues");

//     const pendingQueues = await PresaleModel.find({
//       status: "waiting",
//     }).populate("event");

//     for (const queue of pendingQueues) {
//       const event = queue.event as any;
//       const diff = new Date(event.startDate).getTime() - Date.now();
//       if (diff <= 24 * 60 * 60 * 1000) {
//         // H-1
//         queue.status = "notified";
//         await queue.save(); // otomatis trigger post("save") hook
//         console.log(`📧 Notified user ${queue.user} for event ${event.name}`);
//       }
//     }
//   });
// };
