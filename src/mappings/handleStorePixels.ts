import { Bucket, Transaction } from '../types'
import { MoonbeamCall } from '@subql/contract-processors/dist/moonbeam';
import { BigNumber } from "ethers";

type PixelInput = {
  bucket: number;
  posInBucket: number;
  color: number;
}

type StorePixelArgs =  {
  price: BigNumber;
  pixelInputs: PixelInput[]
}[];

export async function handleStorePixels(event: MoonbeamCall<StorePixelArgs>): Promise<void> {

  logger.info("I WAS HERE")

  const id = `${event.hash}`
  const price = event.args[0].price?.toBigInt()
  const pixelInputs = event.args[0].pixelInputs

  const bucketsPromises = pixelInputs.map((pixelInput) => {
    const bucketId = `${pixelInput.bucket}`

    return Bucket.get(bucketId)
  })

  const resolvedBuckets = await Promise.all(bucketsPromises)

  resolvedBuckets.map(async (resolvedBucket, id) => {
    // we match the resolvedBucket with pixelInput
    const pixelInput = pixelInputs[id]
    const bucketId = `${pixelInput.bucket}`

    if(typeof resolvedBucket === undefined) {
      // bucket doesn't exist create a bucket
      let bucket = new Bucket(bucketId)
      bucket.id = bucketId
      bucket.position = pixelInput.bucket

      // create an array of empty pixels
      let pixels = new Array(16).fill(0);
      // update the color
      pixels[pixelInput.posInBucket] = pixelInput.color
      bucket.pixels = pixels

      logger.info(`ADDED BUCKET #${bucketId}`)

      await bucket.save()
    } else {
      // bucket exists

      // update the pixels array with the corresponding color position
      resolvedBucket.pixels[pixelInput.posInBucket] = pixelInput.color
      
      logger.info(`UPDATED BUCKET #${bucketId}`)
      await resolvedBucket.save()
    }
  })
}
