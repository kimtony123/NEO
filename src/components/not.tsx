import { useEffect, useState } from 'react';
import { message, createDataItemSigner, result } from "@permaweb/aoconnect";
import { PermissionType } from 'arconnect'

const permissions: PermissionType[] = [
  'ACCESS_ADDRESS',
  'SIGNATURE',
  'SIGN_TRANSACTION',
  'DISPATCH'
]

interface Tag {
    name: string;
    value: string;
}

const NOT = "HmOxNfr7ZCmT7hhx1LTO7765b-NGoT6lhha_ffjaCn4"

function aoOptionsNot() {
    const [address, setAddress] = useState('')
    const [notBalance, setNotBalance] = useState(0)
    

    useEffect(() => {
        const fetchBalance = async (process: string) => {
            try {
                const messageResponse = await message({
                    process,
                    tags: [
                        { name: 'Action', value: 'Balance' },
                    ],
                    signer: createDataItemSigner(window.arweaveWallet),
                });
                const getBalanceMessage = messageResponse;
                try {
                    let { Messages, Error } = await result({
                        message: getBalanceMessage,
                        process,
                    });
                    if (Error) {
                        alert("Error fetching balances:" + Error);
                        return;
                    }
                    if (!Messages || Messages.length === 0) {
                        alert("No messages were returned from ao. Please try later.");
                        return;
                    }
                    const balanceTag = Messages[0].Tags.find((tag: Tag) => tag.name === 'Balance')
                    const balance = balanceTag ? parseFloat((balanceTag.value / 1000).toFixed(4)) : 0;
                    if (process === NOT) {
                        setNotBalance(balance)
                    }
                } catch (error) {
                    alert("There was an error when loading balances: " + error)
                }
            } catch (error) {
                console.error(error);
            }
        };
        fetchBalance(NOT)
    }, [address])


    return (
        <div className='border-r border-black'>
                            <p className='text-lg md:text-center'>
                                NOT: <span className='font-bold'>{notBalance}</span>
                            </p>
                        </div>
    )


    
}
export default aoOptionsNot