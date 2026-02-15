import io.socket.client.IO;
import io.socket.client.Socket;
import org.json.JSONObject;
import java.net.URI;
import java.util.Arrays;

public class WarCastleClient {
    private Socket socket;
    private String myNickname = "Командир_Java";
    private String currentRoom = null;

    public void connect() {
        try {
            // Настройки сокета (как в твоем JS: transports websocket)
            IO.Options options = IO.Options.builder()
                    .setTransports(new String[]{"websocket"})
                    .build();

            socket = IO.socket(URI.create("https://megame-server.onrender.com"), options);

            // Обработка подключения
            socket.on(Socket.EVENT_CONNECT, args -> {
                System.out.println("Подключено к серверу War Castle!");
            });

            // ОБНОВЛЕНИЕ СПИСКА ИГРОКОВ (Аналог твоего updatePlayerList)
            socket.on("updatePlayerList", args -> {
                System.out.println("Список игроков обновлен: " + args[0]);
                // Здесь можно добавить логику проверки: если мы первые в списке — мы ХОСТ
            });

            // СТАРТ ИГРЫ (Аналог твоего gameStarted)
            socket.on("gameStarted", args -> {
                System.out.println("БИТВА НАЧИНАЕТСЯ! Загрузка ресурсов...");
            });

            socket.connect();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // Метод для создания комнаты (как твой createRoom)
    public void createRoom() {
        String code = String.valueOf((int)(1000 + Math.random() * 9000));
        joinProcess(code);
    }

    // Метод для входа (как твой joinProcess)
    public void joinProcess(String code) {
        this.currentRoom = code;
        try {
            JSONObject data = new JSONObject();
            data.put("roomId", code);
            data.put("nickname", myNickname);
            
            socket.emit("joinLobby", data);
            System.out.println("Заходим в лобби: " + code);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // Запрос старта (как твой requestStart)
    public void requestStart() {
        if (currentRoom != null) {
            socket.emit("startGameRequest", currentRoom);
        }
    }
}
