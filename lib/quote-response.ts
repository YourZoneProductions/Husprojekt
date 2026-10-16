import {dateDay} from "./timeline";
export type QuoteResponseDraft={amount:string;priceType:string;scope:string;reservations:string;start:string;end:string};
export function responseValues(draft:QuoteResponseDraft){
 const normalized=draft.amount.trim().replace(",", ".");
 if(!/^\d+(?:\.\d{1,2})?$/.test(normalized))throw new Error("Skriv en samlet pris med højst to decimaler og uden tusindtalsseparator, fx 12500,00.");
 const amount=Number(normalized);
 if(!Number.isFinite(amount)||amount<0||amount>99999999999.99)throw new Error("Prisen ligger uden for det tilladte interval.");
 if(!["fixed","estimate"].includes(draft.priceType))throw new Error("Vælg fast pris eller prisoverslag.");
 const scope=draft.scope.trim(),reservations=draft.reservations.trim();
 if(!scope||scope.length>5000)throw new Error("Beskriv hvad tilbuddet omfatter (højst 5.000 tegn).");
 if(reservations.length>3000)throw new Error("Forbehold må højst fylde 3.000 tegn.");
 if((draft.start&&dateDay(draft.start)===null)||(draft.end&&dateDay(draft.end)===null))throw new Error("Kontrollér de foreslåede datoer.");
 if(draft.start&&draft.end&&draft.end<draft.start)throw new Error("Foreslået slutdato må ikke ligge før startdato.");
 return {amount_dkk:amount,price_type:draft.priceType,scope,reservations,proposed_start:draft.start||null,proposed_end:draft.end||null};
}
