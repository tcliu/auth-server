type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

export async function sendMail(message: MailMessage) {
  const preview = [
    '[mail stub]',
    `to=${message.to}`,
    `subject=${message.subject}`,
    message.text
  ].join('\n');

  console.info(preview);
}
