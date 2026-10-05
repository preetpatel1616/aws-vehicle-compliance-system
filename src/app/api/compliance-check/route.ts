import {sendEmail} from "../../utils/email";

export async function POST(request: Request) {
  try {
    //Parse the request
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const state = formData.get("state") as string;

    if (!file || !state) {
      return new Response(
        JSON.stringify({ error: "Filekey and state are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Internal calls go through the auth middleware too, so pass the caller's token on.
    const authorization = request.headers.get("Authorization") ?? "";

    //1.Image upload
    const uploadResponse = await fetch(`${process.env.BASE_URL}/api/images`, {
      method: "POST",
      body: formData,
      headers: { Authorization: authorization },
    });

    //Validate the response
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      return new Response(
        JSON.stringify({
          error: "Image upload failed",
          details: errorData,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const uploadResponseParsed = await uploadResponse.json();

    const { fileKey } = uploadResponseParsed;

    //2.OCR API
    const ocrResponse = await fetch(`${process.env.BASE_URL}/api/ocr`, {
      method: "POST",
      body: JSON.stringify({ fileKey, state }),
      headers: { "Content-Type": "application/json", Authorization: authorization },
    });

    if (!ocrResponse.ok) {
      const errorData = await ocrResponse.json();
      return new Response(
        JSON.stringify({ error: "OCR failed", details: errorData }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { licensePlate } = await ocrResponse.json();

    console.log(licensePlate);

    if (!licensePlate) {
      return new Response(
        JSON.stringify({ error: "License plate not detected" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    // Step 3: Call the Compliance GET API
    const complianceResponse = await fetch(
      `${process.env.BASE_URL}/api/compliances?licensePlate=${licensePlate}`,
      {
        method: "GET",
        headers: { Authorization: authorization },
      }
    );

    if (!complianceResponse.ok) {
      const errorData = await complianceResponse.json();
      return new Response(
        JSON.stringify({
          error: "Compliance check failed",
          details: errorData,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }


    const complianceData = await complianceResponse.json();


    // Send email notification after compliance check
    await sendEmail(
      "preetpatel1616@gmail.com",
      "Compliance Check Completed",
      `The compliance check for vehicle ${licensePlate} is completed.`
    );

    // Final Response
    return new Response(JSON.stringify({ complianceData }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in compliance-check workflow:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
