const SibApiV3Sdk = require('sib-api-v3-sdk');
require('dotenv').config();

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const transactionalEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const enviarCorreo = async (to, subject, htmlContent) => {
  try {
    const sendSmtpEmail = {
      sender: {
        name: process.env.BREVO_FROM_NAME,
        email: process.env.BREVO_FROM_EMAIL
      },
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlContent
    };

    const response = await transactionalEmailApi.sendTransacEmail(sendSmtpEmail);
    console.log(`📧 [Brevo] Correo enviado a ${to}`);
    return response;
  } catch (error) {
    console.error('❌ [Brevo] Error al enviar correo:', error.message);
    throw error;
  }
};

module.exports = { enviarCorreo };