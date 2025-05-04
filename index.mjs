import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";

const s3 = new S3Client({ region: "us-east-2" });
const bucketName = "fotos-tetchu";
const tableName = 'Imagens';
const dynamodb = new DynamoDBClient();

export async function handler(event) {
    try {
        const fileContent = Buffer.from(event.body, "base64");
        const fileName = `uploads/${Date.now()}-image.jpg`;
        const imageUrl = `https://${bucketName}.s3.amazonaws.com/${fileName}`

        const params = {
            Bucket: bucketName,
            Key: fileName,
            Body: fileContent,
            ContentType: "image/jpeg",
            ACL: "public-read"
        };

        await s3.send(new PutObjectCommand(params));

        await salvarUrlNoDB("Usuario1", imageUrl);

        const urls = await listarImagens("Usuario1");

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ imageUrl: urls })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
}

async function salvarUrlNoDB(usuario, urlParaSalvar) {
    const url = urlParaSalvar;
    
    const params = {
        TableName: tableName,
        Item: {
            usuario: { S: usuario },
            timestamp: { S: new Date().toISOString() },
            url: { S: url }
        }
    };

    const comando = new PutItemCommand(params);
    await dynamodb.send(comando);
}

async function listarImagens(usuario) {
    const params = {
        TableName: tableName,
        KeyConditionExpression: 'usuario = :usuario',
        ExpressionAttributeValues: {
            ':usuario': { S: usuario }
        }
    };

    const response = await dynamodb.send(new QueryCommand(params));
    return response.Items.map(item => item.url.S);
}
