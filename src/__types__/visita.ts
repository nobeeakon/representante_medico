type ProductoInformation = {
  productoId: string;
  cantidad: string;
};


type VisitaStatus = 'pleaneado'| 'visitado' |'noEncontrado';

export type Visita = {
  id: string;
  createdAt: string;
  fechaVisita: string | undefined;
  fechaVisitaPlaneada: string;
  entidadObjetivoTipo: string;
  entidadObjetivoId: string;
  estatus: VisitaStatus;
  etiquetasIds?: string[];
  nota?: string;
  productoJson: ProductoInformation[];
};
