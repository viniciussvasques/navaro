"""Email service using SMTP."""

import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List
import asyncio

from app.core.logging import get_logger
from app.services.settings_service import get_cached_setting, get_cached_bool
from app.models.system_settings import SettingsKeys

logger = get_logger(__name__)


class EmailService:
    """Email service using SMTP."""

    @property
    def enabled(self) -> bool:
        return get_cached_bool(SettingsKeys.EMAIL_ENABLED, False)

    @property
    def host(self) -> str:
        return get_cached_setting(SettingsKeys.SMTP_HOST, "") or ""

    @property
    def port(self) -> int:
        port_str = get_cached_setting(SettingsKeys.SMTP_PORT, "587")
        try:
            return int(port_str) if port_str else 587
        except ValueError:
            return 587

    @property
    def user(self) -> str:
        return get_cached_setting(SettingsKeys.SMTP_USER, "") or ""

    @property
    def password(self) -> str:
        return get_cached_setting(SettingsKeys.SMTP_PASSWORD, "") or ""

    @property
    def from_email(self) -> str:
        return get_cached_setting(SettingsKeys.SMTP_FROM_EMAIL, "") or self.user

    @property
    def from_name(self) -> str:
        return get_cached_setting(SettingsKeys.SMTP_FROM_NAME, "Navaro") or "Navaro"

    @property
    def use_tls(self) -> bool:
        return get_cached_bool(SettingsKeys.SMTP_USE_TLS, True)

    async def send(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None
    ) -> bool:
        """
        Send email via SMTP.
        
        Args:
            to_email: Recipient email
            subject: Email subject
            body_html: HTML body content
            body_text: Plain text body (fallback)
        """
        if not self.enabled:
            logger.info("Email disabled", to=to_email, subject=subject)
            return True

        if not self.host or not self.user:
            logger.warning("Email enabled but SMTP not configured")
            return False

        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email

            # Add text and HTML parts
            if body_text:
                msg.attach(MIMEText(body_text, "plain", "utf-8"))
            msg.attach(MIMEText(body_html, "html", "utf-8"))

            # Send in thread pool (SMTP is blocking)
            await asyncio.to_thread(self._send_smtp, msg)
            
            logger.info("Email sent", to=to_email, subject=subject)
            return True

        except Exception as e:
            logger.error("Email error", to=to_email, error=str(e))
            return False

    def _send_smtp(self, msg: MIMEMultipart) -> None:
        """Send email via SMTP (blocking)."""
        context = ssl.create_default_context()
        
        if self.use_tls:
            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls(context=context)
                server.login(self.user, self.password)
                server.send_message(msg)
        else:
            with smtplib.SMTP_SSL(self.host, self.port, context=context) as server:
                server.login(self.user, self.password)
                server.send_message(msg)

    # ─── Email Templates ────────────────────────────────────────────────────────

    async def send_appointment_confirmation(
        self,
        to_email: str,
        customer_name: str,
        establishment_name: str,
        service_name: str,
        date: str,
        time: str
    ) -> bool:
        """Send appointment confirmation email."""
        subject = f"Agendamento Confirmado - {establishment_name}"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .detail {{ background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #667eea; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✂️ Agendamento Confirmado!</h1>
                </div>
                <div class="content">
                    <p>Olá <strong>{customer_name or 'Cliente'}</strong>,</p>
                    <p>Seu agendamento foi confirmado com sucesso!</p>
                    
                    <div class="detail">
                        <strong>📍 Local:</strong> {establishment_name}<br>
                        <strong>💇 Serviço:</strong> {service_name}<br>
                        <strong>📅 Data:</strong> {date}<br>
                        <strong>🕐 Horário:</strong> {time}
                    </div>
                    
                    <p>Chegue com 5 minutos de antecedência. Em caso de imprevisto, cancele com pelo menos 2 horas de antecedência.</p>
                    
                    <p>Até lá! 👋</p>
                </div>
                <div class="footer">
                    <p>Este email foi enviado pelo Navaro</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text = f"""
        Agendamento Confirmado!
        
        Olá {customer_name or 'Cliente'},
        
        Seu agendamento em {establishment_name} foi confirmado:
        - Serviço: {service_name}
        - Data: {date}
        - Horário: {time}
        
        Chegue com 5 minutos de antecedência.
        
        Até lá!
        """
        
        return await self.send(to_email, subject, html, text)

    async def send_appointment_reminder(
        self,
        to_email: str,
        customer_name: str,
        establishment_name: str,
        time: str
    ) -> bool:
        """Send appointment reminder (24h before)."""
        subject = f"Lembrete: Seu horário amanhã em {establishment_name}"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .alert {{ background: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 10px; text-align: center; }}
                .time {{ font-size: 32px; color: #667eea; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="alert">
                    <h2>⏰ Lembrete de Agendamento</h2>
                    <p>Olá <strong>{customer_name or 'Cliente'}</strong>,</p>
                    <p>Você tem horário marcado <strong>amanhã</strong> em:</p>
                    <h3>{establishment_name}</h3>
                    <p class="time">{time}</p>
                    <p>Não esqueça! 😊</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send(to_email, subject, html)

    async def send_cancellation(
        self,
        to_email: str,
        customer_name: str,
        establishment_name: str,
        reason: Optional[str] = None
    ) -> bool:
        """Send appointment cancellation email."""
        subject = f"Agendamento Cancelado - {establishment_name}"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .alert {{ background: #fee2e2; border: 1px solid #ef4444; padding: 20px; border-radius: 10px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="alert">
                    <h2>❌ Agendamento Cancelado</h2>
                    <p>Olá <strong>{customer_name or 'Cliente'}</strong>,</p>
                    <p>Seu agendamento em <strong>{establishment_name}</strong> foi cancelado.</p>
                    {f'<p><strong>Motivo:</strong> {reason}</p>' if reason else ''}
                    <p>Esperamos vê-lo(a) em breve para remarcar!</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send(to_email, subject, html)


# Singleton
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """Get email service singleton."""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
