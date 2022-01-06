import { Bucket, Transaction } from '../types'
import { MoonbeamCall } from '@subql/contract-processors/dist/moonbeam';
import { BigNumber } from "ethers";

type BucketArray = {
  [bucketIndex: number]: number[];
}

type StorePixelArgs = [Array<any>] & {
  pixelInputs: Array<any>
};

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
  
  const bucketArr: BucketArray = {};
  const bucketLength = 16;

  for(let i = 0; i < pixelInputs.length; i++) {
    const input = pixelInputs[i]

    if (bucketArr[input.bucket] == null || bucketArr[input.bucket].length <= 0)
    bucketArr[input.bucket] = Array<number>(bucketLength).fill(0);

    bucketArr[input.bucket][input.posInBucket] = input.color;
  }
  

  const bucketsPromises = pixelInputs.map(async (pixelInput) => {
    const bucketId = `${pixelInput.bucket}`

    const bucket = await Bucket.get(bucketId)
 
     if(!bucket) {
       // logger.info(`ADDED BUCKET #${bucketId}`)
       // bucket doesn't exist create a bucket
       let bucket = new Bucket(bucketId)
       bucket.id = bucketId
       bucket.position = pixelInput.bucket
       // grab the pixel array from bucketArr
       bucket.pixels = bucketArr[pixelInput.bucket]
 
       await bucket.save()
       logger.info(`ADDED BUCKET #${bucket.position}, With pixels ${bucket.pixels}`)
 
     } else {
       // bucket exists
       bucket.pixels = bucketArr[pixelInput.bucket]
       
       logger.info(`UPDATED BUCKET #${bucketId}`)
       await bucket.save()
     }
  })

  await Promise.all(bucketsPromises)
}
