import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";

export type NotificationJobData = {
  path: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class NotificationDispatchService {
  constructor(
    @InjectQueue("notifications")
    private readonly notificationsQueue: Queue<NotificationJobData>,
  ) {}

  async dispatch(path: string, payload: Record<string, unknown>) {
    return this.notificationsQueue.add(
      "dispatch",
      { path, payload },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    );
  }
}
