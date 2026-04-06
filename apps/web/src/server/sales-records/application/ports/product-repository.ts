export interface SalesProductRecord {
  id: number;
  name: string;
  category: string;
  subtype: string | null;
  price: number;
}

export interface ProductRepository {
  findById(id: number): Promise<SalesProductRecord | undefined>;
}
