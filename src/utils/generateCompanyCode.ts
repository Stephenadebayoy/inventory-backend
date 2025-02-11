/** @format */

import slugify from "slugify";
import { nanoid } from "nanoid";

export function generateCompanyCode(companyName: string): string {
  const slug = slugify(companyName, { lower: true, remove: /[*+~.()'"!:@]/g });
  const randomSuffix = nanoid(6);
  return `${slug}-${randomSuffix}`;
}
