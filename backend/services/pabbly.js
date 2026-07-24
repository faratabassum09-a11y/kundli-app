const axios=require("axios"); //axios is a library used to make HTTP requests. HERE IT SENDS A POST REQ TO PABBLY webhook URL

async function sendToPabbly(data){
    const webhookUrl=process.env.PABBLY_WEBHOOK_URL;
    const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        gender: data.gender,
        birthDate: data.birthDate,
        birthTime: data.birthTime,
        birthPlace: data.birthPlace,
        latitude: data.latitude,
        longitude: data.longitude,
    };
    const res=await axios.post(webhookUrl,payload,{
        headers: { 'Content-Type': 'application/json' },
    });
    return res.data;
}

// Separate Pabbly workflow (webhook trigger → Gmail send-email action).
// Pabbly's Gmail action attaches the file by fetching pdfUrl itself, so
// we only need to send it the link, not the PDF bytes.
async function sendKundliEmail(data){
    const webhookUrl=process.env.PABBLY_KUNDLI_EMAIL_WEBHOOK_URL;
    const payload = {
        name: data.name,
        email: data.email,
        pdfUrl: data.pdfUrl,
    };
    const res=await axios.post(webhookUrl,payload,{
        headers: { 'Content-Type': 'application/json' },
    });
    return res.data;
}

module.exports={sendToPabbly, sendKundliEmail};