/**
 * NFT 门票工具
 * 用于生成和管理 NFT 门票
 */

import QRCode from 'qrcode';

/**
 * 生成门票二维码
 * @param {object} qrData - 二维码数据
 * @returns {Promise<string>} Base64 格式的二维码图片
 */
export async function generateQRCode(qrData) {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('QR code generation failed:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * 生成验证码
 */
export function generateVerificationCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * 创建门票元数据
 * @param {object} ticketInfo - 门票信息
 * @returns {Promise<object>} 门票元数据
 */
export async function createTicketMetadata(ticketInfo) {
  try {
    const {
      eventId,
      ticketId,
      eventTitle,
      location,
      startTime,
      holderAddress,
    } = ticketInfo;

    console.log('🎫 Creating ticket metadata...');

    // 生成二维码数据
    const qrData = {
      ticketId,
      eventId,
      holder: holderAddress,
      timestamp: Date.now(),
      verificationCode: generateVerificationCode(),
    };

    const qrCodeImage = await generateQRCode(qrData);

    // 构建门票元数据
    const ticketMetadata = {
      version: '1.0',
      type: 'hackathon-ticket',
      eventTitle,
      eventId,
      ticketId,
      holder: holderAddress,
      issuedAt: new Date().toISOString(),
      location: location || 'TBA',
      startTime: startTime || new Date().toISOString(),
      qrCode: qrCodeImage,
      verificationCode: qrData.verificationCode,
      status: 'Valid',
    };

    console.log('✅ Ticket metadata created');

    return ticketMetadata;
  } catch (error) {
    console.error('❌ Failed to create ticket metadata:', error);
    throw new Error(`Ticket creation failed: ${error.message}`);
  }
}

/**
 * 验证门票二维码
 * @param {string} qrCodeData - 二维码数据（JSON 字符串）
 * @param {string} ticketId - 门票 ID
 * @returns {boolean} 是否有效
 */
export function verifyTicketQRCode(qrCodeData, ticketId) {
  try {
    const data = JSON.parse(qrCodeData);
    return data.ticketId === ticketId && data.timestamp > 0;
  } catch (error) {
    console.error('QR code verification failed:', error);
    return false;
  }
}

/**
 * 验证门票有效性
 * @param {object} ticket - 门票对象
 * @returns {boolean} 是否有效
 */
export function isTicketValid(ticket) {
  if (!ticket) return false;
  
  const now = new Date();
  const startTime = new Date(ticket.startTime);
  
  return ticket.status === 'Valid' && now >= startTime;
}
