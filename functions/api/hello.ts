export const onRequest = async (context: any) => {
  return new Response(JSON.stringify({ 
    message: "Olá de Cloudflare Pages!" ,
    timestamp: new Date().toISOString()
  }), {
    headers: {
      "content-type": "application/json;charset=UTF-8"
    }
  });
};
