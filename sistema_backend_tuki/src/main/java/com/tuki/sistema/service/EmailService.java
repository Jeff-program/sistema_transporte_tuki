package com.tuki.sistema.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    public boolean enviarCorreoRecuperacion(String destinatario, String nombre, String codigo) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(destinatario);
            helper.setSubject("Transporte Tuki - Código de Recuperación de Acceso");

            String htmlMsg = """
                <div style="background-color: #f3f4f6; padding: 40px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; 
                                border-radius: 16px; overflow: hidden; 
                                box-shadow: 0 10px 25px rgba(0,0,0,0.05);">

                        <!-- ENCABEZADO CON DEGRADADO Y LOGO CIRCULAR -->
                        <div style="background: linear-gradient(135deg, #2A3F54, #1c2b39); padding: 45px 20px 35px; text-align: center;">
                            
                            <div style="width: 160px; height: 160px; background-color: #ffffff; 
                                        border-radius: 50%%; margin: 0 auto; display: inline-block; 
                                        text-align: center; line-height: 160px; overflow: hidden;
                                        box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
                                <!-- El logo se adapta dentro del círculo -->
                                <img src="cid:logoTuki" alt="Transporte Tuki" 
                                     style="max-width: 120px; max-height: 120px; vertical-align: middle;">
                            </div>

                            <h2 style="color: #ffffff; margin: 25px 0 0 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">
                                Recuperación de Acceso
                            </h2>
                        </div>

                        <!-- CONTENIDO PRINCIPAL -->
                        <div style="padding: 40px 35px;">
                            <p style="font-size: 16px; color: #334155; margin-top: 0;">
                                Hola <b style="color: #0f172a;">%s</b>,
                            </p>

                            <p style="font-size: 15px; color: #475569; line-height: 1.6;">
                                Hemos recibido una solicitud para restablecer tu acceso al sistema de 
                                <b style="color: #1ABB9C;">Transporte Tuki</b>. Ingresa el siguiente código de verificación:
                            </p>

                            <!-- CÓDIGO DESTACADO CON NUEVO ESTILO -->
                            <div style="text-align: center; margin: 40px 0;">
                                <div style="
                                    display: inline-block;
                                    font-size: 38px;
                                    font-weight: 800;
                                    letter-spacing: 12px;
                                    color: #1ABB9C;
                                    background-color: #f0fdfa;
                                    padding: 20px 40px;
                                    border-radius: 16px;
                                    border: 2px dashed #1ABB9C;
                                ">
                                    %s
                                </div>
                            </div>

                            <!-- CAJA DE ADVERTENCIA MEJORADA -->
                            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; 
                                        padding: 15px 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
                                <p style="margin: 0; color: #b45309; font-size: 14px; line-height: 1.5;">
                                    <b style="color: #92400e;">Atención:</b> Este código es de un solo uso y expirará en <b>2 minutos</b> por tu seguridad.
                                </p>
                            </div>

                            <p style="font-size: 13px; color: #94a3b8; text-align: center; 
                                      border-top: 1px solid #e2e8f0; padding-top: 25px; margin-bottom: 0;">
                                Si no solicitaste este código, ignora este mensaje. Tu cuenta está segura.
                            </p>
                        </div>

                        <!-- PIE DE PÁGINA -->
                        <div style="background-color: #f8fafc; padding: 20px; text-align: center; 
                                    font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9;">
                            © Transporte Tuki
                        </div>
                    </div>
                </div>
            """.formatted(nombre, codigo); 

            helper.setText(htmlMsg, true);

            ClassPathResource logo = new ClassPathResource("static/logo.png");
            helper.addInline("logoTuki", logo);

            mailSender.send(message);
            return true;
        } catch (Exception e) {
            log.error("No se pudo enviar el correo de recuperacion a {}", destinatario, e);
            return false;
        }
    }
}
