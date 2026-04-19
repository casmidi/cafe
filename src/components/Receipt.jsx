import React, { forwardRef } from 'react';

const Receipt = forwardRef(({ data }, ref) => {
    if (!data) return null;

    const {
        invoice_no, cashier_name, items,
        sub_total, service_charge, tax, total_amount,
        payment_method, cash_received, change, date,
        outlet_info, table_name, payment_status,
        discount_amount, redeem_value, points_redeemed, customer
    } = data;

    // Gunakan ukuran kertas dari LocalStorage (default 58mm)
    const paperSize = localStorage.getItem('printerSize') || '58mm';
    // Lebar CSS: 58mm -> ~219px (w-[58mm]), 80mm -> ~302px (w-[78mm] safe margin)
    const widthClass = paperSize === '80mm' ? 'w-[78mm]' : 'w-[58mm]';

    const isPending = payment_status === 'pending' || payment_method === 'pay_later';

    // Hitung Poin yang Didapat (Default: Rp 10.000 = 1 Poin jika setting tidak ada)
    // Menggunakan setting point_conversion_rate dari backend
    const conversionRate = parseInt(outlet_info?.point_conversion_rate) || 10000;
    const pointsEarned = customer ? Math.floor(total_amount / conversionRate) : 0;

    return (
        <div ref={ref} className={`hidden print:block p-2 text-black font-mono text-xs ${widthClass} mx-auto leading-tight`}>

            {/* HEADER DINAMIS */}
            <div className="text-center mb-4 border-b border-dashed border-black pb-2 flex flex-col items-center">

                {/* TAMPILKAN LOGO JIKA ADA */}
                {outlet_info?.logo_url && (
                    <img
                        src={outlet_info.logo_url}
                        alt="Logo"
                        className="w-16 h-auto mb-2 object-contain grayscale"
                    // grayscale agar hasil cetak thermal lebih tajam (hitam putih)
                    />
                )}

                <h1 className="font-bold text-lg uppercase mb-1 leading-none">{outlet_info?.name || 'CAFE 86'}</h1>
                <p className="whitespace-pre-wrap mb-1 px-2">{outlet_info?.address || 'Alamat Belum Diatur'}</p>
                {outlet_info?.phone && <p>Telp: {outlet_info.phone}</p>}
            </div>

            {/* INFO TRANSAKSI */}
            <div className="mb-2 space-y-1 text-[10px]">
                <div className="flex justify-between">
                    <span>No:</span>
                    <span className="font-bold">{invoice_no}</span>
                </div>
                <div className="flex justify-between">
                    <span>Tgl:</span>
                    <span>{date}</span>
                </div>
                <div className="flex justify-between">
                    <span>Kasir:</span>
                    <span>{cashier_name || 'Admin'}</span>
                </div>
                {table_name && (
                    <div className="flex justify-between">
                        <span>Meja:</span>
                        <span className="font-bold">{table_name}</span>
                    </div>
                )}
                {customer && (
                    <div className="flex justify-between border-t border-dashed border-gray-400 mt-1 pt-1">
                        <span>Member:</span>
                        <span className="font-bold">{customer.name}</span>
                    </div>
                )}
            </div>

            {/* ITEM BELANJA */}
            <div className="border-t border-dashed border-black py-2 mb-2">
                {items.map((item, index) => (
                    <div key={index} className="mb-1">
                        <div className="font-bold">{item.name}</div>

                        {/* Tampilkan Varian & Modifier di Struk */}
                        {(item.variant_name || (item.modifiers_name && item.modifiers_name.length > 0)) && (
                            <div className="pl-2 text-[9px] italic mb-0.5">
                                {item.variant_name && <div>+ {item.variant_name}</div>}
                                {item.modifiers_name && item.modifiers_name.map((mod, idx) => (
                                    <div key={idx}>+ {mod}</div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between pl-2">
                            <span>{item.qty} x {parseInt(item.price).toLocaleString('id-ID')}</span>
                            <span>{(item.qty * item.price).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* TOTAL & PAJAK */}
            <div className="border-t border-dashed border-black pt-2 mb-4 space-y-1">
                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{parseInt(sub_total).toLocaleString('id-ID')}</span>
                </div>

                {discount_amount > 0 && (
                    <div className="flex justify-between">
                        <span>Diskon</span>
                        <span>-{parseInt(discount_amount).toLocaleString('id-ID')}</span>
                    </div>
                )}

                {/* Info Redeem Poin di Struk */}
                {redeem_value > 0 && (
                    <div className="flex justify-between italic">
                        <span>Redeem Poin ({points_redeemed})</span>
                        <span>-{parseInt(redeem_value).toLocaleString('id-ID')}</span>
                    </div>
                )}

                {/* Tampilkan Service Charge jika ada */}
                {parseFloat(service_charge) > 0 && (
                    <div className="flex justify-between">
                        <span>Service ({parseFloat(outlet_info?.service_charge_rate || 0)}%)</span>
                        <span>{parseInt(service_charge).toLocaleString('id-ID')}</span>
                    </div>
                )}

                {/* Tampilkan Pajak */}
                {parseFloat(tax) > 0 && (
                    <div className="flex justify-between">
                        <span>Tax ({parseFloat(outlet_info?.tax_rate || 0)}%)</span>
                        <span>{parseInt(tax).toLocaleString('id-ID')}</span>
                    </div>
                )}

                <div className="flex justify-between font-bold text-sm border-t border-dashed border-black pt-1 mt-1">
                    <span>TOTAL</span>
                    <span>Rp {parseInt(total_amount).toLocaleString('id-ID')}</span>
                </div>

                {/* STATUS PEMBAYARAN */}
                {isPending ? (
                    <div className="border-t border-dashed border-black mt-2 pt-1 text-center">
                        <span className="font-bold text-sm uppercase">*** BELUM LUNAS ***</span>
                        {payment_method === 'pay_later' && <p className="text-[10px] mt-1">(Pay Later)</p>}
                    </div>
                ) : (
                    <>
                        {payment_method === 'cash' ? (
                            <>
                                <div className="flex justify-between mt-1">
                                    <span>Tunai</span>
                                    <span>{parseInt(cash_received || total_amount).toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Kembali</span>
                                    <span>{parseInt(change || 0).toLocaleString('id-ID')}</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex justify-between mt-1">
                                <span>Bayar</span>
                                <span className="uppercase">{payment_method?.replace('_', ' ') || 'NON-TUNAI'}</span>
                            </div>
                        )}
                        <div className="text-center mt-2 text-[10px] font-bold uppercase">*** LUNAS ***</div>
                    </>
                )}
            </div>

            {/* INFO POIN MEMBER (Jika Ada) */}
            {customer && !isPending && (
                <div className="border-t border-dashed border-black pt-2 mb-2 text-[9px]">
                    <div className="flex justify-between">
                        <span>Poin Didapat:</span>
                        <span>+{pointsEarned}</span>
                    </div>
                    {points_redeemed > 0 && (
                        <div className="flex justify-between">
                            <span>Poin Dipakai:</span>
                            <span>-{points_redeemed}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold mt-0.5">
                        <span>Sisa Poin:</span>
                        {/* Hitung estimasi sisa poin (Poin Lama - Redeem + Earned) */}
                        <span>{parseInt(customer.points) - (points_redeemed || 0) + pointsEarned}</span>
                    </div>
                </div>
            )}

            {/* FOOTER DINAMIS */}
            <div className="text-center border-t border-dashed border-black pt-2">
                <p className="mb-1">{outlet_info?.receipt_footer || 'Terima Kasih atas kunjungan Anda!'}</p>
                <p className="text-[9px] mt-2 text-gray-500">Powered by {outlet_info?.name || 'Cafe 86 POS'}</p>
            </div>
        </div>
    );
});

Receipt.displayName = 'Receipt';
export default Receipt;