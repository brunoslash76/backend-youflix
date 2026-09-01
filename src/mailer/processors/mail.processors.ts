import { Processor } from "@nestjs/bull";
import { WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import Mailgun from "mailgun.js";
import { config } from "../../config";

interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, any>;
}

@Processor('mail-queue')
export class MailProcessor extends WorkerHost {
  private message;
  private domain: string;

  constructor(

  ) { 
    super();

    const mailgun = new Mailgun(FormData);

    this.message = mailgun.client({
      username: 'api',
      key: config.mailgun.apiKey!,
    })

    this.domain = config.mailgun.domain!;
  }

  async process(job: Job<EmailJobData>) {
    const { to, subject, template, variables } = job.data;
    return this.message.messages.create(this.domain, {
      from: 'no-reply@' + this.domain,
      to: [to],
      subject,
      template,
      'h:X-Mailgun-Variables': JSON.stringify(variables),
    })
  }

}