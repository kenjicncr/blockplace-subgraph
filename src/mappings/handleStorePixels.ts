import { Bucket, Transaction } from '../types'
import { MoonbeamCall } from '@subql/contract-processors/dist/moonbeam';
import { BigNumber } from "ethers";

type PixelInput = {
  bucket: number;
  posInBucket: number;
  color: number;
}


type StorePixelArgs = [Array<any>] & {
  pixelInputs: Array<any>
};

type BidPlacedCallrgs = [string, BigNumber, BigNumber] & { ca: string; tokenId: BigNumber; price: BigNumber; };

export async function handleStorePixels(event: MoonbeamCall<StorePixelArgs>): Promise<void> {
  logger.info(event.success)
  logger.info("I WAS HERE")

  const id = `${event.hash}`
  const { success } = event
  // const price = event.args[0].price?.toBigInt()

  // this is a proxy
  const color = event.args.pixelInputs[0][2]

  let pixelInputs = []

  for (let step = 0; step < event.args.pixelInputs.length; step++) {
    // Runs 5 times, with values of step 0 through 4.

    const _pixelInput = event.args.pixelInputs[step]
    pixelInputs.push({
      bucket: _pixelInput[0].toString(),
      posInBucket: _pixelInput[1],
      color: _pixelInput[2],
    })
  }

  const bucketsPromises = pixelInputs.map((pixelInput) => {
    const bucketId = `${pixelInput.bucket}`

    return Bucket.get(bucketId)
  })

  const resolvedBuckets = await Promise.all(bucketsPromises)

  for (let step = 0; step < resolvedBuckets.length; step++) {
    // we match the resolvedBucket with pixelInput

    const resolvedBucket = resolvedBuckets[step]
    const pixelInput = pixelInputs[step]
    const bucketId = `${pixelInput.bucket}`

    if(!resolvedBucket) {
      // logger.info(`ADDED BUCKET #${bucketId}`)
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
  }
}
