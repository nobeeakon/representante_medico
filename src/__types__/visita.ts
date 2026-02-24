type ProductoInformation = {
  productoId: string;
  cantidad: string;
};

export type Visita = {
  id: string;
  createdAt: string;
  fechaVisita: string;
  entidadObjetivoTipo: string;
  entidadObjetivoId: string;
  estatus: string;
  etiquetasIds?: string[];
  nota?: string;
  productoJson: ProductoInformation[];
};
