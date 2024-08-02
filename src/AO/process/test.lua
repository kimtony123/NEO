local json = require("json")

balances = balances or {}


USDA = "GcFxqTQnKHcr304qnOcq00ZqbaYGDn4Wbb0DHAM-wvU";

-- Function to check the balance in the USDA process for a given user
function checkUSDAProcessBalance(m)
    local userId = m.From
    -- Send a request to the USDA process to get the user's balance
    ao.send({
        Target = USDA,
        Action = "Balances",
        Account = userId,
        ResponseAction = "ReceiveUSDAProcessBalance",
    })
end



Handlers.add(
    "ReceiveUSDAProcessBalance",
    Handlers.utils.hasMatchingTag("Action", "ReceiveUSDAProcessBalance"),
    function(m)
        -- Ensure m is a table and has the expected fields
        if type(m) == "table" then
            local userId = m.OriginalSender
            local balance = tonumber(m.Data)

            if userId and balance then
                balances[userId] = balance
                print("Updated balance for user " .. userId .. ": " .. tostring(balance))
            else
                print("Failed to update balance: userId or balance not found.")
            end
        else
            print("Error: Message is not a table or missing expected fields.")
        end
    end
)




-- Handler to test the checkUSDAProcessBalance function
Handlers.add(
    "CheckUSDAProcessBalanceHandler",
    Handlers.utils.hasMatchingTag("Action", "CheckUSDAProcessBalance"),
    function(m)
        local userId = m.From
        -- Call the function to check the USDA process balance
        checkUSDAProcessBalance(userId)

        -- Respond with a message indicating that the balance check is in progress
        Handlers.utils.reply("Balance check initiated for user: " .. userId)(m)
    end
)