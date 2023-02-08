// dependencies
import aws from 'aws-sdk'
import { inspect } from 'util'
import sharp from 'sharp'
import imageType, { minimumBytes } from 'image-type'

// set thumbnail width. Resize will set the height automatically to maintain aspect ratio.
const width = 300
const bucketName = 'bucketName'

// get reference to S3 client
const s3 = new aws.S3()

const objectExist = async function (bucket, key) {
  try {
    console.log(`checking ${bucket}/${key} exists...`)
    await s3.headObject({ Bucket: bucket, Key: key }).promise()
    return true
  } catch (_) {
    return false
  }
}

export const handler = async (event, context, callback) => {
  // Read options from the event parameter.
  console.log("Reading options from event:\n", inspect(event, {depth: 5}))
  const { outputRoute, outputToken, inputS3Url } = event.getObjectContext

  const srcBucket = bucketName
  const srcKey = decodeURIComponent(new URL(inputS3Url).pathname.slice(1))

  const dstBucket = srcBucket
  const dstKey = `${srcKey}/thumbnail/${width}`

  try {
    const exist = await objectExist(dstBucket, dstKey)
    if (exist) {
      console.log(`${dstKey} already existed, skip resizing`)

      const resizedImage = await s3.getObject({ Bucket: dstBucket, Key: dstKey }).promise()

      await s3.writeGetObjectResponse({
        RequestRoute: outputRoute,
        RequestToken: outputToken,
        Body: resizedImage.Body
      }).promise()

      return {
        statusCode: 200
      }
    }

    // Download the image from the S3 source bucket.
    const origimage = await s3.getObject({ Bucket: srcBucket, Key: srcKey }).promise() 

    // Check that the image type is supported
    const { mime } = await imageType(Buffer.from(origimage.Body), minimumBytes)
    if (!mime.includes('image')) {
      throw new Error(`Unsupported image type: ${mime}`)
    }

    // Use the sharp module to resize the image and save in a buffer.
    const buffer = await sharp(origimage.Body).resize(width).toBuffer()

    // Upload the thumbnail image to the destination bucket
    const destparams = {
      Bucket: dstBucket,
      Key: dstKey,
      Body: buffer,
      ContentType: 'image'
    }

    const promises = [
      s3.putObject(destparams).promise(),
      s3.writeGetObjectResponse({
        RequestRoute: outputRoute,
        RequestToken: outputToken,
        Body: buffer
      }).promise()
    ]

    await Promise.all(promises)

    console.log('Successfully resized ' + srcBucket + '/' + srcKey +
    ' and uploaded to ' + dstBucket + '/' + dstKey)

    return {
      statusCode: 200,
    }
  } catch (error) {
    console.log(error)
    return
  }
}